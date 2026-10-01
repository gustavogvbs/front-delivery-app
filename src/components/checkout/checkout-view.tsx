"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  ConnectingBanner,
  FullPageMessage,
} from "@/components/common/connecting";
import { LocationPicker } from "@/components/map/location-picker";
import { BrandScope } from "@/components/store/store-brand";
import {
  CartChange,
  CartLine,
  clearCart,
  loadCart,
  reconcileCart,
  saveCart,
  stashChanges,
  subtotalOf,
  unavailableLines,
} from "@/lib/cart";
import {
  buildOrderBody,
  checkoutSchema,
  CheckoutValues,
  emptyCheckout,
  zodResolver,
} from "@/lib/checkout-form";
import {
  cacheOrder,
  discardIdempotencyKey,
  getOrCreateIdempotencyKey,
  loadCustomer,
  saveCustomer,
} from "@/lib/checkout-session";
import {
  formatBRL,
  formatKm,
  maskCep,
  maskMoney,
  maskPhone,
  onlyDigits,
} from "@/lib/format";
import { isApiError } from "@/lib/http";
import { isTransient, pingHealth, withWakeRetry } from "@/lib/wake";
import {
  createOrder,
  getMenu,
  getQuote,
  lookupCep,
} from "@/services/public-api";
import type { DeliveryQuote, LatLng, Menu } from "@/types/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bike,
  CreditCard,
  Loader2,
  QrCode,
  Store,
  Wallet,
} from "lucide-react";

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; quote: DeliveryQuote }
  | { status: "error"; message: string };

type SubmitError =
  | { kind: "message"; message: string }
  | { kind: "network"; message: string }
  | { kind: "idempotency"; message: string };

export function CheckoutView({ slug }: { slug: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    void pingHealth();
  }, []);

  const menuQuery = useQuery({
    queryKey: ["menu", slug],
    queryFn: () => withWakeRetry(() => getMenu(slug)),
    // o estado aberto/fechado pode mudar sozinho (horário automático)
    refetchInterval: 60_000,
    retry: false,
    staleTime: 30_000,
  });
  const menu = menuQuery.data;

  // carrinho reconciliado com o cardápio atual
  const [lines, setLines] = useState<CartLine[] | null>(null);
  const [changes, setChanges] = useState<CartChange[]>([]);
  useEffect(() => {
    if (!menu) return;
    const r = reconcileCart(loadCart(slug), menu);
    saveCart(slug, r.lines);
    setLines(r.lines);
    setChanges(r.changes);
  }, [menu, slug]);

  // Idempotency-Key: criada ao entrar no checkout e reaproveitada até o sucesso
  const keyRef = useRef<string | null>(null);
  useEffect(() => {
    keyRef.current = getOrCreateIdempotencyKey(slug);
  }, [slug]);

  if (menuQuery.isError) {
    const notFound =
      isApiError(menuQuery.error) && menuQuery.error.status === 404;
    return (
      <FullPageMessage
        title={
          notFound ? "Loja não encontrada" : "Não foi possível carregar a loja"
        }
      >
        {!notFound && (
          <button
            className="h-12 rounded-xl bg-zinc-900 px-6 font-semibold text-white"
            onClick={() => menuQuery.refetch()}
          >
            Tentar de novo
          </button>
        )}
      </FullPageMessage>
    );
  }
  if (!menu || lines === null) {
    return (
      <>
        <ConnectingBanner />
        <FullPageMessage title="Carregando…">
          <Loader2 className="size-6 animate-spin text-zinc-400" />
        </FullPageMessage>
      </>
    );
  }
  if (lines.length === 0) {
    return (
      <FullPageMessage title="Seu carrinho está vazio">
        <Link
          href={`/${slug}`}
          className="mt-2 flex h-12 items-center rounded-xl bg-zinc-900 px-6 font-semibold text-white"
        >
          Ver cardápio
        </Link>
      </FullPageMessage>
    );
  }

  return (
    <BrandScope color={menu.primaryColor}>
      <ConnectingBanner />
      <CheckoutForm
        slug={slug}
        menu={menu}
        lines={lines}
        changes={changes}
        getKey={() => keyRef.current ?? getOrCreateIdempotencyKey(slug)}
        renewKey={() => {
          discardIdempotencyKey(slug);
          keyRef.current = getOrCreateIdempotencyKey(slug);
        }}
        onConflict={async (message) => {
          // 409: volta ao carrinho mostrando o que mudou (cardápio atualizado)
          const fresh = await queryClient.fetchQuery({
            queryKey: ["menu", slug],
            queryFn: () => withWakeRetry(() => getMenu(slug)),
            staleTime: 0,
          });
          const r = reconcileCart(loadCart(slug), fresh);
          saveCart(slug, r.lines);
          stashChanges(slug, { message, changes: r.changes });
          router.push(`/${slug}?carrinho=1`);
        }}
        onSuccess={(order) => {
          cacheOrder(order);
          clearCart(slug);
          discardIdempotencyKey(slug);
          router.replace(`/${slug}/pedido/${order.id}?enviar=1`);
        }}
      />
    </BrandScope>
  );
}

interface FormProps {
  slug: string;
  menu: Menu;
  lines: CartLine[];
  changes: CartChange[];
  getKey: () => string;
  renewKey: () => void;
  onConflict: (message: string) => Promise<void>;
  onSuccess: (order: Awaited<ReturnType<typeof createOrder>>) => void;
}

function CheckoutForm({
  slug,
  menu,
  lines,
  changes,
  getKey,
  renewKey,
  onConflict,
  onSuccess,
}: FormProps) {
  const defaultType = menu.acceptsDelivery ? "ENTREGA" : "RETIRADA";
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: emptyCheckout(defaultType),
    mode: "onTouched",
  });

  // lembra nome, telefone e último endereço neste aparelho
  useEffect(() => {
    const c = loadCustomer();
    if (!c) return;
    reset({
      ...emptyCheckout(defaultType),
      name: c.name ?? "",
      phone: maskPhone(c.phone ?? ""),
      ...(c.address ? { ...c.address, cep: maskCep(c.address.cep) } : {}),
    });
  }, [reset, defaultType]);

  const deliveryType = watch("deliveryType");
  const paymentMethod = watch("paymentMethod");
  const needChange = watch("needChange");
  const noPin = watch("noPin");

  // ── mapa e cotação ──
  const [pin, setPin] = useState<LatLng | null>(null);
  const [center, setCenter] = useState<LatLng>(
    menu.location ?? { lat: -23.5505, lng: -46.6333 },
  );
  const [recenterKey, setRecenterKey] = useState(0);
  const [quote, setQuote] = useState<QuoteState>({ status: "idle" });
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "notfound">(
    "idle",
  );

  useEffect(() => {
    if (!pin || deliveryType !== "ENTREGA") return;
    setQuote({ status: "loading" });
    const t = setTimeout(async () => {
      try {
        const q = await withWakeRetry(() => getQuote(slug, pin));
        setQuote({ status: "ok", quote: q });
      } catch (e) {
        setQuote({
          status: "error",
          message: isApiError(e)
            ? e.message
            : "Não foi possível calcular a entrega.",
        });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [pin, deliveryType, slug]);

  const onCep = useCallback(
    async (masked: string) => {
      const digits = onlyDigits(masked);
      if (digits.length !== 8) return;
      setCepStatus("loading");
      const r = await lookupCep(digits);
      if (!r) {
        setCepStatus("notfound");
        return;
      }
      setCepStatus("idle");
      if (r.street) setValue("street", r.street, { shouldValidate: true });
      if (r.neighborhood)
        setValue("neighborhood", r.neighborhood, { shouldValidate: true });
      if (r.city) setValue("city", r.city, { shouldValidate: true });
      if (r.state) setValue("state", r.state);
      if (r.location) {
        setCenter(r.location);
        setPin((p) => p ?? r.location); // sugestão: o cliente confere/ajusta
        setRecenterKey((k) => k + 1);
      }
    },
    [setValue],
  );

  // ── totais exibidos (estimativa; o back recalcula e a confirmação mostra o valor final) ──
  const subtotal = subtotalOf(lines);
  const outOfArea =
    deliveryType === "ENTREGA" &&
    !noPin &&
    quote.status === "ok" &&
    !quote.quote.withinArea;
  const fee =
    deliveryType === "RETIRADA"
      ? 0
      : !noPin && quote.status === "ok" && quote.quote.withinArea
        ? quote.quote.feeCents
        : null;
  const blockedLines = unavailableLines(lines, menu);
  const belowMin = menu.minOrderCents !== null && subtotal < menu.minOrderCents;

  let blockReason: string | null = null;
  if (!menu.isOpen)
    blockReason = `Loja fechada · ${menu.openStatus.label.replace(/^Fechado · /, "")}`;
  else if (blockedLines.length)
    blockReason =
      "Há itens indisponíveis no carrinho. Volte ao cardápio para removê-los.";
  else if (belowMin)
    blockReason = `O pedido mínimo é ${formatBRL(menu.minOrderCents!)} (sem a entrega).`;
  else if (deliveryType === "ENTREGA" && !noPin && !pin)
    blockReason = "Confirme o local da entrega no mapa.";
  else if (deliveryType === "ENTREGA" && !noPin && quote.status === "loading")
    blockReason = "Calculando a entrega…";
  else if (outOfArea)
    blockReason = `Este endereço está fora da área de entrega${menu.acceptsPickup ? ". Você pode escolher retirada." : "."}`;

  // ── envio ──
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const onSubmit = async (values: CheckoutValues) => {
    if (blockReason || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    saveCustomer({
      name: values.name.trim(),
      phone: onlyDigits(values.phone),
      address:
        values.deliveryType === "ENTREGA"
          ? {
              cep: onlyDigits(values.cep),
              street: values.street,
              number: values.number,
              complement: values.complement,
              neighborhood: values.neighborhood,
              city: values.city,
              state: values.state,
              reference: values.reference,
            }
          : loadCustomer()?.address,
    });
    const body = buildOrderBody(values, lines, pin);
    const key = getKey(); // a MESMA chave em todas as tentativas
    try {
      const order = await withWakeRetry(() => createOrder(slug, body, key));
      onSuccess(order);
    } catch (e) {
      setSubmitting(false);
      const msg = isApiError(e) ? e.message : "Erro inesperado.";
      if (
        isApiError(e) &&
        e.status === 409 &&
        msg.startsWith("A loja está fechada")
      ) {
        // fechou no meio do checkout: fica aqui, com o carrinho, e atualiza o aviso
        setSubmitError({
          kind: "message",
          message: `${msg} Seu carrinho continua salvo.`,
        });
        void queryClient.invalidateQueries({ queryKey: ["menu", slug] });
        return;
      }
      if (isApiError(e) && e.status === 409) {
        await onConflict(msg);
        return;
      }
      if (isTransient(e)) {
        setSubmitError({
          kind: "network",
          message:
            "Não conseguimos falar com a loja agora. Verifique sua conexão e tente de novo — seu pedido não será duplicado.",
        });
      } else if (isApiError(e) && e.status === 429) {
        setSubmitError({
          kind: "message",
          message: `${msg} Aguarde alguns minutos antes de tentar de novo.`,
        });
      } else if (isApiError(e) && e.status === 422) {
        setSubmitError({
          kind: "idempotency",
          message:
            "Já recebemos um envio deste checkout com dados diferentes. Se você não recebeu a confirmação, confira com a loja pelo WhatsApp antes de enviar de novo.",
        });
      } else {
        setSubmitError({ kind: "message", message: msg });
      }
      setTimeout(
        () =>
          errorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          }),
        50,
      );
    }
  };

  const field =
    "h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base focus:border-brand focus:outline-none";
  const label = "text-sm font-medium text-zinc-700";
  const err = (m?: string) =>
    m ? <p className="mt-1 text-sm text-red-700">{m}</p> : null;

  return (
    <main className="mx-auto max-w-md pb-40">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-white px-2 py-2">
        <Link
          href={`/${slug}`}
          aria-label="Voltar ao cardápio"
          className="flex size-11 items-center justify-center rounded-full text-zinc-700"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Finalizar pedido
          </h1>
          <p className="text-xs text-zinc-500">{menu.name}</p>
        </div>
      </header>

      {changes.length > 0 && (
        <div
          role="alert"
          className="mx-4 mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          Seu carrinho foi atualizado com o cardápio atual. Confira os valores
          abaixo.
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-6 px-4 pt-4"
      >
        {/* ── Seus dados ── */}
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Seus dados</h2>
          <label className="block">
            <span className={label}>Nome</span>
            <input
              {...register("name")}
              autoComplete="name"
              className={field}
              placeholder="Como devemos te chamar?"
            />
            {err(errors.name?.message)}
          </label>
          <label className="block">
            <span className={label}>Celular (WhatsApp)</span>
            <Controller
              control={control}
              name="phone"
              render={({ field: f }) => (
                <input
                  {...f}
                  onChange={(e) => f.onChange(maskPhone(e.target.value))}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(15) 99999-9999"
                  className={field}
                />
              )}
            />
            {err(errors.phone?.message)}
          </label>
        </section>

        {/* ── Entrega ou retirada ── */}
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-zinc-900">
            Como você quer receber?
          </h2>
          <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="Entrega ou retirada"
          >
            {menu.acceptsDelivery && (
              <ChoiceButton
                active={deliveryType === "ENTREGA"}
                onClick={() => setValue("deliveryType", "ENTREGA")}
                icon={<Bike className="size-5" />}
              >
                Entrega
              </ChoiceButton>
            )}
            {menu.acceptsPickup && (
              <ChoiceButton
                active={deliveryType === "RETIRADA"}
                onClick={() => setValue("deliveryType", "RETIRADA")}
                icon={<Store className="size-5" />}
              >
                Retirar na loja
              </ChoiceButton>
            )}
          </div>
          {!menu.acceptsDelivery && !menu.acceptsPickup && (
            <p className="text-sm text-red-700">
              Esta loja não está recebendo pedidos no momento.
            </p>
          )}

          {deliveryType === "ENTREGA" && (
            <div className="space-y-3">
              <label className="block">
                <span className={label}>CEP</span>
                <Controller
                  control={control}
                  name="cep"
                  render={({ field: f }) => (
                    <input
                      {...f}
                      onChange={(e) => {
                        const v = maskCep(e.target.value);
                        f.onChange(v);
                        void onCep(v);
                      }}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      className={field}
                    />
                  )}
                />
                {cepStatus === "loading" && (
                  <p className="mt-1 text-sm text-zinc-500">
                    Buscando endereço…
                  </p>
                )}
                {cepStatus === "notfound" && (
                  <p className="mt-1 text-sm text-amber-800">
                    CEP não encontrado. Preencha o endereço manualmente.
                  </p>
                )}
                {err(errors.cep?.message)}
              </label>
              <label className="block">
                <span className={label}>Rua</span>
                <input
                  {...register("street")}
                  autoComplete="address-line1"
                  className={field}
                />
                {err(errors.street?.message)}
              </label>
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <label className="block">
                  <span className={label}>Número</span>
                  <input
                    {...register("number")}
                    inputMode="numeric"
                    className={field}
                  />
                  {err(errors.number?.message)}
                </label>
                <label className="block">
                  <span className={label}>Complemento</span>
                  <input
                    {...register("complement")}
                    autoComplete="address-line2"
                    placeholder="Apto, bloco…"
                    className={field}
                  />
                </label>
              </div>
              <label className="block">
                <span className={label}>Bairro</span>
                <input {...register("neighborhood")} className={field} />
                {err(errors.neighborhood?.message)}
              </label>
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <label className="block">
                  <span className={label}>Cidade</span>
                  <input
                    {...register("city")}
                    autoComplete="address-level2"
                    className={field}
                  />
                  {err(errors.city?.message)}
                </label>
                <label className="block">
                  <span className={label}>UF</span>
                  <input
                    {...register("state")}
                    maxLength={2}
                    autoCapitalize="characters"
                    className={field}
                  />
                </label>
              </div>
              <label className="block">
                <span className={label}>Ponto de referência (opcional)</span>
                <input
                  {...register("reference")}
                  className={field}
                  placeholder="Ex.: portão azul"
                />
              </label>

              <div className="space-y-2 pt-2">
                <span className={label}>Local da entrega no mapa</span>
                {!noPin && (
                  <LocationPicker
                    center={center}
                    pin={pin}
                    onPinChange={setPin}
                    recenterKey={recenterKey}
                  />
                )}
                <label className="flex min-h-11 items-center gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    {...register("noPin")}
                    className="size-5 accent-[var(--brand)]"
                  />
                  Não consigo marcar no mapa (a loja combina a taxa pelo
                  WhatsApp)
                </label>
                <QuoteInfo quote={quote} noPin={noPin} hasPin={pin !== null} />
              </div>
            </div>
          )}
        </section>

        {/* ── Pagamento ── */}
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Pagamento na entrega</h2>
          <div
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Forma de pagamento"
          >
            <ChoiceButton
              active={paymentMethod === "PIX"}
              onClick={() => setValue("paymentMethod", "PIX")}
              icon={<QrCode className="size-5" />}
            >
              Pix
            </ChoiceButton>
            <ChoiceButton
              active={paymentMethod === "DINHEIRO"}
              onClick={() => setValue("paymentMethod", "DINHEIRO")}
              icon={<Wallet className="size-5" />}
            >
              Dinheiro
            </ChoiceButton>
            <ChoiceButton
              active={paymentMethod === "CARTAO"}
              onClick={() => setValue("paymentMethod", "CARTAO")}
              icon={<CreditCard className="size-5" />}
            >
              Cartão
            </ChoiceButton>
          </div>
          {paymentMethod === "PIX" && (
            <p className="text-sm text-zinc-500">
              A chave Pix aparece na confirmação do pedido.
            </p>
          )}
          {paymentMethod === "CARTAO" && (
            <p className="text-sm text-zinc-500">
              Pagamento na maquininha, na entrega ou retirada.
            </p>
          )}
          {paymentMethod === "DINHEIRO" && (
            <div className="space-y-2">
              <label className="flex min-h-11 items-center gap-3 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  {...register("needChange")}
                  className="size-5 accent-[var(--brand)]"
                />
                Preciso de troco
              </label>
              {needChange && (
                <label className="block">
                  <span className={label}>Troco para quanto?</span>
                  <Controller
                    control={control}
                    name="changeForCents"
                    render={({ field: f }) => (
                      <input
                        value={f.value ? formatBRL(f.value) : ""}
                        onChange={(e) =>
                          f.onChange(maskMoney(e.target.value).cents)
                        }
                        onBlur={f.onBlur}
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                        className={field}
                      />
                    )}
                  />
                  {err(errors.changeForCents?.message)}
                </label>
              )}
            </div>
          )}
        </section>

        <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <label className="block">
            <span className={label}>Observações do pedido (opcional)</span>
            <textarea
              {...register("notes")}
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-zinc-300 p-3 text-base focus:border-brand focus:outline-none"
            />
          </label>
        </section>

        {/* ── Resumo ── */}
        <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Resumo</h2>
          <ul className="space-y-1 text-sm">
            {lines.map((l) => (
              <li key={l.lineId} className="flex justify-between gap-3">
                <span className="text-zinc-700">
                  {l.quantity}x {l.name}
                  {l.notes ? (
                    <span className="block text-xs text-zinc-400">
                      Obs.: {l.notes}
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums">
                  {formatBRL(l.unitPriceCents * l.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t pt-2 text-sm">
            <Row label="Subtotal" value={formatBRL(subtotal)} />
            <Row
              label={deliveryType === "RETIRADA" ? "Retirada" : "Entrega"}
              value={
                deliveryType === "RETIRADA"
                  ? "Grátis"
                  : fee !== null
                    ? formatBRL(fee)
                    : noPin
                      ? "A combinar"
                      : "—"
              }
            />
            <Row
              label="Total estimado"
              value={formatBRL(subtotal + (fee ?? 0))}
              strong
            />
          </div>
          <p className="text-xs text-zinc-500">
            O valor final é confirmado pela loja ao receber o pedido.
          </p>
        </section>

        <p className="px-1 text-xs text-zinc-500">
          Seus dados são usados apenas para processar e entregar este pedido.{" "}
          <a href="/privacidade" target="_blank" className="underline">
            Política de privacidade
          </a>
          .
        </p>

        <div ref={errorRef}>
          {submitError && (
            <div
              role="alert"
              className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            >
              <p>{submitError.message}</p>
              {submitError.kind === "idempotency" && (
                <button
                  type="button"
                  onClick={() => {
                    renewKey();
                    setSubmitError(null);
                  }}
                  className="h-11 w-full rounded-lg border border-red-300 font-semibold"
                >
                  Enviar como um novo pedido
                </button>
              )}
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md space-y-2 border-t bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {blockReason && (
            <p className="text-center text-sm text-amber-800">{blockReason}</p>
          )}
          <button
            type="submit"
            disabled={blockReason !== null || submitting}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-semibold text-white disabled:bg-zinc-300"
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Enviando pedido…
              </>
            ) : submitError?.kind === "network" ? (
              "Tentar enviar de novo"
            ) : (
              `Enviar pedido • ${formatBRL(subtotal + (fee ?? 0))}`
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

function ChoiceButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 text-sm font-semibold ${
        active
          ? "border-brand bg-brand text-white"
          : "border-zinc-200 bg-white text-zinc-700"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${strong ? "text-base font-bold text-zinc-900" : "text-zinc-600"}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function QuoteInfo({
  quote,
  noPin,
  hasPin,
}: {
  quote: QuoteState;
  noPin: boolean;
  hasPin: boolean;
}) {
  if (noPin) {
    return (
      <p className="rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">
        Taxa de entrega a combinar com a loja.
      </p>
    );
  }
  if (!hasPin || quote.status === "idle") return null;
  if (quote.status === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" /> Calculando a entrega…
      </p>
    );
  }
  if (quote.status === "error") {
    return (
      <p
        role="alert"
        className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
      >
        {quote.message}
      </p>
    );
  }
  const q = quote.quote;
  if (!q.acceptsDelivery) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
        Esta loja não está fazendo entregas no momento.
      </p>
    );
  }
  if (!q.withinArea) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
        Fora da área de entrega ({formatKm(q.distanceMeters ?? 0)} da loja; a
        loja entrega até {formatKm(q.maxMeters ?? 0)}).
      </p>
    );
  }
  return (
    <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
      {formatKm(q.distanceMeters ?? 0)} da loja • entrega{" "}
      {formatBRL(q.feeCents ?? 0)}
    </p>
  );
}
