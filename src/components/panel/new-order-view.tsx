"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Stepper } from "@/components/common/stepper";
import { LocationPicker } from "@/components/map/location-picker";
import { OrderItemLine } from "@/components/orders/order-item-line";
import { splitFieldError } from "@/lib/api-errors";
import {
  formatBRL,
  maskCep,
  maskMoney,
  maskPhone,
  onlyDigits,
} from "@/lib/format";
import { isApiError } from "@/lib/http";
import { orderTypeLongLabel } from "@/lib/order-lines";
import { readText, remove, writeText } from "@/lib/storage";
import { withWakeRetry } from "@/lib/wake";
import { createManualOrder, previewManualOrder } from "@/services/panel-api";
import { lookupCep } from "@/services/public-api";
import type { LatLng, PaymentMethod } from "@/types/api";
import type {
  ManualOrderBody,
  ManualOrderPreview,
  OrderType,
  PanelCategory,
  PanelTenant,
} from "@/types/panel";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { panelKeys, useCatalog, usePanelTenant } from "./use-panel";

const TYPES: { key: OrderType; label: string }[] = [
  { key: "BALCAO", label: "Balcão" },
  { key: "CONSUMO_LOCAL", label: "Comer no local" },
  { key: "RETIRADA", label: "Retirada" },
  { key: "ENTREGA", label: "Entrega" },
];
const PAYMENTS: { key: PaymentMethod; label: string }[] = [
  { key: "DINHEIRO", label: "Dinheiro" },
  { key: "PIX", label: "Pix" },
  { key: "CARTAO", label: "Cartão" },
];
const FALLBACK_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 };

/** Idempotency-Key do rascunho: reaproveitada nas novas tentativas, descartada no sucesso. */
const keyStorage = (tenantId: string) => `idem-manual:${tenantId}`;
function draftKey(tenantId: string) {
  const existing = readText("session", keyStorage(tenantId));
  if (existing) return existing;
  const key = crypto.randomUUID();
  writeText("session", keyStorage(tenantId), key);
  return key;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Line {
  key: string;
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
}

export function NewOrderView() {
  const tenant = usePanelTenant();
  const catalog = useCatalog();
  if (!tenant.data || !catalog.data) {
    return (
      <main className="flex justify-center py-10 text-zinc-400">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }
  return <NewOrderForm tenant={tenant.data} categories={catalog.data} />;
}

function NewOrderForm({
  tenant,
  categories,
}: {
  tenant: PanelTenant;
  categories: PanelCategory[];
}) {
  const router = useRouter();
  const qc = useQueryClient();

  // ── produtos ──
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [lines, setLines] = useState<Line[]>([]);

  // ── pedido ──
  const [type, setType] = useState<OrderType>("BALCAO");
  const [table, setTable] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState(tenant.address.city);
  const [uf, setUf] = useState(tenant.address.state ?? "");
  const [reference, setReference] = useState("");
  const [pin, setPin] = useState<LatLng | null>(null);
  const [center, setCenter] = useState<LatLng>(
    tenant.location ?? FALLBACK_CENTER,
  );
  const [recenter, setRecenter] = useState(0);
  const [fee, setFee] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("DINHEIRO");
  const [change, setChange] = useState("");
  const [notes, setNotes] = useState("");

  const [preview, setPreview] = useState<ManualOrderPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = useRef(false);

  // pré-carrega o mapa: a troca para "Entrega" não trava a tela enquanto o
  // atendente já está digitando
  useEffect(() => {
    void import("@/components/map/location-map");
  }, []);

  const products = useMemo(() => {
    const q = normalize(search.trim());
    return categories
      .filter((c) => category === "all" || c.id === category)
      .flatMap((c) => c.products.map((p) => ({ ...p, categoryName: c.name })))
      .filter((p) => !q || normalize(p.name).includes(q));
  }, [categories, category, search]);

  const add = (p: { id: string; name: string; priceCents: number }) =>
    setLines((ls) => {
      const same = ls.find((l) => l.productId === p.id && !l.notes);
      if (same)
        return ls.map((l) =>
          l === same ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l,
        );
      return [
        ...ls,
        {
          key: `${p.id}-${Date.now()}`,
          productId: p.id,
          name: p.name,
          unitPriceCents: p.priceCents,
          quantity: 1,
          notes: "",
        },
      ];
    });
  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const delivery = type === "ENTREGA";

  // corpo enviado ao back (prévia e criação): nada calculado aqui
  const body: ManualOrderBody | null = useMemo(() => {
    if (lines.length === 0) return null;
    const b: ManualOrderBody = {
      deliveryType: type,
      paymentMethod: payment,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        ...(l.notes.trim() ? { notes: l.notes.trim() } : {}),
      })),
    };
    if (type === "CONSUMO_LOCAL" && table.trim()) b.tableLabel = table.trim();
    if (name.trim()) b.customerName = name.trim();
    if (onlyDigits(phone)) b.customerPhone = onlyDigits(phone);
    if (delivery) {
      b.address = {
        cep: onlyDigits(cep),
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        ...(complement.trim() ? { complement: complement.trim() } : {}),
        ...(uf.trim() ? { state: uf.trim().toUpperCase() } : {}),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
      };
      if (pin) b.location = pin;
      const feeCents = maskMoney(fee).cents;
      if (fee.trim() !== "" && feeCents !== null) b.deliveryFeeCents = feeCents;
    }
    const changeCents = maskMoney(change).cents;
    if (payment === "DINHEIRO" && changeCents !== null)
      b.changeForCents = changeCents;
    if (notes.trim()) b.notes = notes.trim();
    return b;
  }, [
    lines,
    type,
    payment,
    table,
    name,
    phone,
    delivery,
    cep,
    street,
    number,
    neighborhood,
    city,
    complement,
    uf,
    reference,
    pin,
    fee,
    change,
    notes,
  ]);

  // prévia com o total do back, ~400 ms depois da última mudança
  const bodyKey = body ? JSON.stringify(body) : "";
  const seq = useRef(0);
  useEffect(() => {
    if (!body) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const mine = ++seq.current;
    setPreviewing(true);
    const timer = setTimeout(async () => {
      try {
        const p = await withWakeRetry(() => previewManualOrder(body));
        if (mine !== seq.current) return;
        setPreview(p);
        setPreviewError(null);
      } catch (err) {
        if (mine !== seq.current) return;
        setPreview(null);
        setPreviewError(splitFieldError(err).message);
      } finally {
        if (mine === seq.current) setPreviewing(false);
      }
    }, 400);
    return () => clearTimeout(timer);
    // bodyKey resume o corpo inteiro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey]);

  const fillFromCep = async (masked: string) => {
    const digits = onlyDigits(masked);
    if (digits.length !== 8) return;
    const found = await lookupCep(digits);
    if (!found) return;
    setStreet((s) => found.street || s);
    setNeighborhood((s) => found.neighborhood || s);
    setCity((s) => found.city || s);
    setUf((s) => found.state || s);
    if (found.location && !pin) {
      setCenter(found.location);
      setRecenter((k) => k + 1);
    }
  };

  const ready = Boolean(body && preview && !previewing && !previewError);

  const confirm = async () => {
    if (!body || !ready || busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setSubmitError(null);
    const key = draftKey(tenant.id);
    try {
      // erro de rede: tenta de novo com a MESMA chave (sem pedido duplicado)
      const order = await withWakeRetry(() => createManualOrder(body, key));
      remove("session", keyStorage(tenant.id));
      void qc.invalidateQueries({ queryKey: panelKeys.orders });
      qc.setQueryData(panelKeys.order(order.id), order);
      toast.success(`Pedido #${order.number} registrado.`);
      router.push(`/painel/pedidos/${order.id}`);
    } catch (err) {
      if (isApiError(err) && err.status === 422) {
        // a chave já gerou um pedido com outros dados (ex.: resposta perdida)
        remove("session", keyStorage(tenant.id));
        setSubmitError(
          "Este rascunho já gerou um pedido. Confira a lista de pedidos antes de registrar de novo.",
        );
      } else {
        setSubmitError(splitFieldError(err).message);
      }
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const itemsCount = lines.reduce((s, l) => s + l.quantity, 0);
  const field =
    "h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none focus:border-zinc-900";

  return (
    <main className="mx-auto max-w-6xl px-4 pb-36 pt-3 lg:pb-10">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/painel"
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100"
          aria-label="Voltar aos pedidos"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">Novo pedido</h1>
      </div>

      {preview && !preview.storeOpen && (
        <p
          className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"
          data-testid="closed-hint"
        >
          A loja está fechada para pedidos online ({preview.openLabel}). O
          pedido do balcão é registrado normalmente.
        </p>
      )}

      <div className="gap-6 lg:grid lg:grid-cols-[1fr_420px] lg:items-start">
        {/* ── produtos ── */}
        <section aria-label="Produtos">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto"
              aria-label="Buscar produto"
              className={`${field} pl-10`}
            />
          </label>
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {[{ id: "all", name: "Tudo" }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${
                  category === c.id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!p.isAvailable}
                  onClick={() => add(p)}
                  className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left active:bg-zinc-50 disabled:opacity-50"
                  aria-label={`Adicionar ${p.name}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-zinc-900">
                      {p.name}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {p.isAvailable ? p.categoryName : "Indisponível"}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-zinc-800">
                    {formatBRL(p.priceCents)}
                  </span>
                </button>
              </li>
            ))}
            {products.length === 0 && (
              <li className="rounded-xl bg-white p-4 text-center text-sm text-zinc-500">
                Nenhum produto encontrado.
              </li>
            )}
          </ul>
        </section>

        {/* ── pedido ── */}
        <section
          id="pedido"
          aria-label="Pedido"
          className="mt-6 space-y-4 rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-32 lg:mt-0 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Itens</h2>
            {lines.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500">
                Toque nos produtos para adicionar.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-100">
                {lines.map((l) => (
                  <li
                    key={l.key}
                    className="space-y-2 py-2"
                    data-testid="draft-line"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <OrderItemLine
                        item={{
                          quantity: l.quantity,
                          productName: l.name,
                          totalCents: l.unitPriceCents * l.quantity,
                        }}
                        showPrice={false}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLines((ls) => ls.filter((x) => x.key !== l.key))
                        }
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-red-600"
                        aria-label={`Remover ${l.name}`}
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stepper
                        value={l.quantity}
                        onChange={(q) => updateLine(l.key, { quantity: q })}
                        label={`Quantidade de ${l.name}`}
                      />
                      <input
                        value={l.notes}
                        onChange={(e) =>
                          updateLine(l.key, {
                            notes: e.target.value.slice(0, 200),
                          })
                        }
                        placeholder="Obs. (ex.: sem cebola)"
                        aria-label={`Observação de ${l.name}`}
                        className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 text-base"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <fieldset>
            <legend className="font-semibold text-zinc-900">
              Tipo do pedido
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={type === t.key}
                  onClick={() => setType(t.key)}
                  className={`h-12 rounded-xl border-2 text-sm font-semibold ${
                    type === t.key
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          {type === "CONSUMO_LOCAL" && (
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Mesa ou identificação (opcional)
              </span>
              <input
                value={table}
                onChange={(e) => setTable(e.target.value.slice(0, 40))}
                placeholder="Ex.: Mesa 5, Varanda 2"
                className={`mt-1 ${field}`}
              />
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Nome do cliente{" "}
                {type === "ENTREGA" || type === "RETIRADA" ? "" : "(opcional)"}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                autoComplete="off"
                className={`mt-1 ${field}`}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Telefone {type === "ENTREGA" ? "" : "(opcional)"}
              </span>
              <input
                value={phone}
                inputMode="tel"
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                autoComplete="off"
                className={`mt-1 ${field}`}
              />
            </label>
          </div>

          {delivery && (
            <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
              <p className="font-semibold text-zinc-900">Endereço de entrega</p>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  CEP (opcional)
                </span>
                <input
                  value={cep}
                  inputMode="numeric"
                  onChange={(e) => {
                    const v = maskCep(e.target.value);
                    setCep(v);
                    void fillFromCep(v);
                  }}
                  placeholder="00000-000"
                  className={`mt-1 ${field}`}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">Rua</span>
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value.slice(0, 120))}
                  className={`mt-1 ${field}`}
                />
              </label>
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Número
                  </span>
                  <input
                    value={number}
                    onChange={(e) => setNumber(e.target.value.slice(0, 20))}
                    className={`mt-1 ${field}`}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Complemento
                  </span>
                  <input
                    value={complement}
                    onChange={(e) => setComplement(e.target.value.slice(0, 80))}
                    className={`mt-1 ${field}`}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Bairro
                </span>
                <input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value.slice(0, 80))}
                  className={`mt-1 ${field}`}
                />
              </label>
              <div className="grid grid-cols-[3fr_1fr] gap-2">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Cidade
                  </span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value.slice(0, 80))}
                    className={`mt-1 ${field}`}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">UF</span>
                  <input
                    value={uf}
                    maxLength={2}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    className={`mt-1 ${field}`}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Referência (opcional)
                </span>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value.slice(0, 120))}
                  className={`mt-1 ${field}`}
                />
              </label>
              <div>
                <p className="mb-1 text-sm font-medium text-zinc-700">
                  Local no mapa (calcula a taxa)
                </p>
                <LocationPicker
                  center={center}
                  pin={pin}
                  onPinChange={setPin}
                  recenterKey={recenter}
                />
              </div>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Taxa de entrega (digitar)
                </span>
                <input
                  value={fee}
                  inputMode="numeric"
                  onChange={(e) => setFee(maskMoney(e.target.value).text)}
                  placeholder={pin ? "Pelas faixas da loja" : "A combinar"}
                  className={`mt-1 ${field}`}
                />
                <span className="mt-1 block text-xs text-zinc-500">
                  Se preencher, vale esta taxa (mesmo com o pino no mapa).
                </span>
              </label>
            </div>
          )}

          <fieldset>
            <legend className="font-semibold text-zinc-900">Pagamento</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={payment === p.key}
                  onClick={() => setPayment(p.key)}
                  className={`h-11 rounded-xl border text-sm font-semibold ${
                    payment === p.key
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 text-zinc-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {payment === "DINHEIRO" && (
              <label className="mt-3 block">
                <span className="text-sm text-zinc-700">
                  Troco para (opcional)
                </span>
                <input
                  value={change}
                  inputMode="numeric"
                  onChange={(e) => setChange(maskMoney(e.target.value).text)}
                  placeholder="Sem troco"
                  className={`mt-1 ${field}`}
                />
              </label>
            )}
          </fieldset>

          <label className="block">
            <span className="font-semibold text-zinc-900">
              Observação do pedido
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={2}
              className="mt-1 w-full rounded-xl border border-zinc-300 p-3 text-base"
            />
          </label>

          {/* resumo: valores SEMPRE do back */}
          <div
            className="rounded-xl bg-zinc-50 p-3 text-sm"
            data-testid="manual-summary"
          >
            <p className="font-semibold text-zinc-900">
              Resumo ·{" "}
              {orderTypeLongLabel({
                deliveryType: type,
                tableLabel: table.trim() || null,
              })}
            </p>
            {previewing && (
              <p className="mt-1 flex items-center gap-1 text-zinc-500">
                <Loader2 className="size-4 animate-spin" /> Calculando…
              </p>
            )}
            {!previewing && previewError && (
              <p role="alert" className="mt-1 text-red-700">
                {previewError}
              </p>
            )}
            {!previewing && preview && (
              <dl className="mt-1 space-y-1 text-zinc-700">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatBRL(preview.subtotalCents)}
                  </dd>
                </div>
                {delivery && (
                  <div className="flex justify-between">
                    <dt>Entrega</dt>
                    <dd className="tabular-nums">
                      {preview.deliveryFeeCents === null
                        ? "A combinar"
                        : formatBRL(preview.deliveryFeeCents)}
                    </dd>
                  </div>
                )}
                <div
                  className="flex justify-between text-base font-bold text-zinc-900"
                  data-testid="manual-total"
                >
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {formatBRL(preview.totalCents)}
                    {preview.deliveryFeePending ? " + entrega" : ""}
                  </dd>
                </div>
              </dl>
            )}
            {!body && (
              <p className="mt-1 text-zinc-500">Adicione pelo menos um item.</p>
            )}
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || submitting}
            className="hidden h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50 lg:flex"
          >
            {submitting && <Loader2 className="size-5 animate-spin" />}
            Confirmar pedido
            {preview ? ` · ${formatBRL(preview.totalCents)}` : ""}
          </button>
        </section>
      </div>

      {/* celular/tablet: barra fixa com o total e o botão */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <a href="#pedido" className="min-w-0 flex-1 text-sm text-zinc-700">
            <span className="block font-semibold">
              {itemsCount} {itemsCount === 1 ? "item" : "itens"}
            </span>
            <span className="block tabular-nums">
              {preview ? formatBRL(preview.totalCents) : "—"}
            </span>
          </a>
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || submitting}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-5 animate-spin" />}
            Confirmar pedido
          </button>
        </div>
      </div>
    </main>
  );
}
