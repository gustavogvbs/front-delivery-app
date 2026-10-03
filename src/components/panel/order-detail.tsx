"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { OrderItemLine } from "@/components/orders/order-item-line";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatBRL, formatKm, maskCep } from "@/lib/format";
import { isApiError } from "@/lib/http";
import { orderTypeLabel, orderTypeLongLabel } from "@/lib/order-lines";
import {
  dateTimeShort,
  EVENT_LABEL,
  paymentText,
  phoneText,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/panel-format";
import { autoPrint } from "@/lib/print";
import { runOrderAction } from "@/services/panel-api";
import type { OrderAction, PanelOrder } from "@/types/panel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

import { EditOrderSheet } from "./edit-order-sheet";
import { ActionBar, PanelPage } from "./panel-page";
import { markPrinted, PrintButton } from "./print-button";
import { panelKeys, usePanelOrder, usePanelTenant } from "./use-panel";

const DONE_TOAST: Record<OrderAction, string> = {
  accept: "Pedido aceito.",
  reject: "Pedido recusado.",
  complete: "Pedido concluído.",
  cancel: "Pedido cancelado.",
};

/** Ações que pedem confirmação (com motivo opcional). */
const CONFIRM: Partial<
  Record<OrderAction, { title: string; button: string; hint: string }>
> = {
  reject: {
    title: "Recusar pedido",
    button: "Recusar pedido",
    hint: "Ex.: acabou o ingrediente, fora do horário…",
  },
  cancel: {
    title: "Cancelar pedido",
    button: "Cancelar pedido",
    hint: "Ex.: cliente desistiu, endereço não encontrado…",
  },
};

export function OrderDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const query = usePanelOrder(id);
  const tenant = usePanelTenant();
  const order = query.data;

  const [confirm, setConfirm] = useState<OrderAction | null>(null);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  /** Depois de aceitar/recusar/cancelar/editar: destaca "Avisar cliente". */
  const [notify, setNotify] = useState(false);
  // trava síncrona contra clique duplo (o estado do React chega um render depois)
  const busy = useRef(false);

  const applyOrder = (data: PanelOrder) => {
    qc.setQueryData(panelKeys.order(id), data);
    void qc.invalidateQueries({ queryKey: panelKeys.orders });
    if (data.tab) void qc.invalidateQueries({ queryKey: panelKeys.tabs });
  };

  const mutation = useMutation({
    mutationFn: (vars: { action: OrderAction; reason?: string }) =>
      runOrderAction(id, vars.action, vars.reason),
    onSuccess: (data, vars) => {
      applyOrder(data);
      toast.success(DONE_TOAST[vars.action]);
      // impressão automática ao aceitar (só se ligada NESTE aparelho)
      if (vars.action === "accept" && tenant.data) {
        void autoPrint(tenant.data, data.id, "accept").then(
          (ok) => ok && markPrinted(data.id),
        );
      }
      setConfirm(null);
      setReason("");
      setNotify(vars.action !== "complete" && Boolean(data.notifyCustomerUrl));
    },
    onError: (err) => {
      toast.error(
        isApiError(err) && err.status !== 0
          ? err.message
          : "Sem conexão com o servidor. Tente de novo.",
      );
      if (isApiError(err) && err.status === 409) {
        setConfirm(null);
        void query.refetch();
      }
    },
    onSettled: () => {
      busy.current = false;
    },
  });

  const run = (action: OrderAction, why?: string) => {
    if (busy.current) return;
    busy.current = true;
    mutation.mutate({ action, reason: why?.trim() || undefined });
  };
  const pendingAction = mutation.isPending ? mutation.variables?.action : null;
  const disabled = mutation.isPending;

  if (!order) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        {query.isError ? (
          <>
            <p className="text-zinc-700">
              {isApiError(query.error) && query.error.status === 404
                ? "Pedido não encontrado."
                : "Não foi possível carregar o pedido."}
            </p>
            <Link
              href="/painel"
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-zinc-900 px-5 font-semibold text-white"
            >
              Voltar aos pedidos
            </Link>
          </>
        ) : (
          <Loader2 className="mx-auto size-6 animate-spin text-zinc-400" />
        )}
      </main>
    );
  }

  const delivery = order.deliveryType === "ENTREGA";
  const editable = order.status === "PENDENTE" || order.status === "ACEITO";
  const a = order.address;
  const finalReason =
    order.status === "RECUSADO"
      ? order.rejectionReason
      : order.status === "CANCELADO"
        ? order.cancellationReason
        : null;
  const confirmCfg = confirm ? CONFIRM[confirm] : undefined;
  // pedido de comanda: o motivo fica registrado (o valor sai da conta)
  const reasonRequired = order.tab !== null;
  const closeConfirm = () => {
    if (mutation.isPending) return;
    setConfirm(null);
    setReason("");
  };

  return (
    <PanelPage
      width="detail"
      className={`space-y-3 ${editable ? "pb-44 lg:pb-16" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={order.tab ? `/painel/mesas/${order.tab.id}` : "/painel"}
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100"
          aria-label={order.tab ? "Voltar à comanda" : "Voltar aos pedidos"}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">
          Pedido #{order.number}
        </h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_CLASS[order.status]}`}
          data-testid="order-status"
        >
          {STATUS_LABEL[order.status]}
        </span>
        <span
          className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-sm font-semibold text-white"
          data-testid="order-type"
        >
          {orderTypeLabel(order)}
        </span>
        {order.source === "MANUAL" && (
          <span className="rounded-full border border-zinc-300 px-2.5 py-0.5 text-sm text-zinc-600">
            Manual
          </span>
        )}
        {order.tab && (
          <Link
            href={`/painel/mesas/${order.tab.id}`}
            className="flex h-11 items-center rounded-full border border-zinc-900 px-3 text-sm font-semibold text-zinc-900"
            data-testid="order-tab-link"
          >
            Comanda {order.tab.label}
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">
          Recebido {dateTimeShort(order.createdAt)}
          {order.editedAt ? ` · editado ${dateTimeShort(order.editedAt)}` : ""}
        </p>
        {tenant.data && <PrintButton orderId={order.id} tenant={tenant.data} />}
      </div>

      {order.notifyCustomerUrl && notify && (
        <div className="rounded-2xl border-2 border-[#25D366] bg-white p-4">
          <p className="font-semibold text-zinc-900">Avise o cliente</p>
          <p className="mt-1 text-sm text-zinc-600">
            A mensagem com a situação do pedido já está pronta no WhatsApp.
          </p>
          <a
            href={order.notifyCustomerUrl}
            className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white"
          >
            <MessageCircle className="size-5" />
            Avisar cliente no WhatsApp
          </a>
        </div>
      )}

      {/* celular: uma coluna (ordem pelos order-*); desktop: itens à esquerda,
          ações, cliente, tipo e histórico à direita */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-4">
        <div className="contents lg:flex lg:flex-col lg:gap-3">
          <Card title="Itens" className="order-3">
            <ul className="space-y-2">
              {order.items.map((i) => (
                <li key={i.id}>
                  <OrderItemLine item={i} />
                </li>
              ))}
            </ul>
            {order.notes && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Observação do pedido:</strong> {order.notes}
              </p>
            )}
            {/* totais SEMPRE do back (inclusive depois de editar) */}
            <dl className="mt-3 space-y-1 border-t pt-3 text-sm text-zinc-600">
              <Row label="Subtotal" value={formatBRL(order.subtotalCents)} />
              {delivery && (
                <Row
                  label="Entrega"
                  value={
                    order.deliveryFeeCents === null
                      ? "A combinar"
                      : formatBRL(order.deliveryFeeCents)
                  }
                />
              )}
              <div
                className="flex justify-between text-base font-bold text-zinc-900"
                data-testid="order-total"
              >
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatBRL(order.totalCents)}
                  {order.deliveryFeePending ? " + entrega" : ""}
                </dd>
              </div>
              <Row
                label="Pagamento"
                value={`${order.tab ? "Na comanda (no fechamento)" : paymentText(order.paymentMethod)}${
                  order.changeForCents
                    ? ` · troco para ${formatBRL(order.changeForCents)}`
                    : ""
                }`}
              />
            </dl>
          </Card>

          {finalReason && (
            <Card title="Motivo" className="order-4">
              <p className="text-zinc-700">{finalReason}</p>
            </Card>
          )}
        </div>
        <div className="contents lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-3">
          {editable && (
            <section
              className="hidden rounded-2xl bg-white p-4 shadow-sm lg:block"
              aria-label="Ações do pedido"
            >
              <div className="grid grid-cols-2 gap-2">
                {order.status === "PENDENTE" ? (
                  <>
                    <ActionButton
                      className="col-span-2 bg-emerald-600 text-white"
                      onClick={() => run("accept")}
                      disabled={disabled}
                      loading={pendingAction === "accept"}
                    >
                      Aceitar pedido
                    </ActionButton>
                    <ActionButton
                      className="border border-red-300 text-red-700"
                      onClick={() => setConfirm("reject")}
                      disabled={disabled}
                    >
                      Recusar
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <ActionButton
                      className="col-span-2 bg-zinc-900 text-white"
                      onClick={() => run("complete")}
                      disabled={disabled}
                      loading={pendingAction === "complete"}
                    >
                      Concluir pedido
                    </ActionButton>
                    <ActionButton
                      className="border border-red-300 text-red-700"
                      onClick={() => setConfirm("cancel")}
                      disabled={disabled}
                    >
                      Cancelar
                    </ActionButton>
                  </>
                )}
                <ActionButton
                  className="border border-zinc-300 text-zinc-800"
                  onClick={() => setEditing(true)}
                  disabled={disabled}
                >
                  <Pencil className="size-4" />
                  Editar
                </ActionButton>
              </div>
            </section>
          )}
          <Card title="Cliente" className="order-1">
            <p className="font-medium text-zinc-900">
              {order.customer.name ?? (
                <span className="font-normal text-zinc-500">
                  Nome não informado
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {order.customer.phone ? (
                <a
                  href={`tel:+${order.customer.phone.replace(/\D/g, "")}`}
                  className="flex h-11 items-center gap-2 rounded-xl border border-zinc-300 px-3 text-sm font-medium"
                >
                  <Phone className="size-4" />
                  {phoneText(order.customer.phone)}
                </a>
              ) : (
                <span className="text-sm text-zinc-500">Sem telefone</span>
              )}
              {order.notifyCustomerUrl && !notify && (
                <a
                  href={order.notifyCustomerUrl}
                  className="flex h-11 items-center gap-2 rounded-xl border border-[#25D366] px-3 text-sm font-medium text-[#128C7E]"
                >
                  <MessageCircle className="size-4" />
                  Avisar no WhatsApp
                </a>
              )}
            </div>
          </Card>

          <Card title={orderTypeLongLabel(order)} className="order-2">
            {!delivery ? (
              <p className="text-zinc-700">
                {order.deliveryType === "RETIRADA"
                  ? "O cliente vai buscar na loja."
                  : order.deliveryType === "BALCAO"
                    ? "Pedido no balcão / para viagem."
                    : order.tableLabel
                      ? `Consumo no local · ${order.tableLabel}.`
                      : "Consumo no local."}
              </p>
            ) : (
              <>
                {a && (
                  <address className="not-italic text-zinc-800">
                    {a.street}, {a.number}
                    {a.complement ? ` – ${a.complement}` : ""}
                    <br />
                    {a.neighborhood} · {a.city}
                    {a.state ? `/${a.state}` : ""}
                    {a.cep ? ` · CEP ${maskCep(a.cep)}` : ""}
                    {a.reference && (
                      <span className="mt-1 block text-sm text-zinc-600">
                        Referência: {a.reference}
                      </span>
                    )}
                  </address>
                )}
                <p className="mt-2 text-sm text-zinc-600">
                  {order.distanceMeters !== null
                    ? `${formatKm(order.distanceMeters)} da loja (em linha reta)`
                    : "Sem localização no mapa: taxa a combinar"}
                </p>
                {order.location && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${order.location.lat}&mlon=${order.location.lng}#map=17/${order.location.lat}/${order.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-300 px-3 text-sm font-medium"
                  >
                    <MapPin className="size-4" />
                    Ver no mapa
                  </a>
                )}
              </>
            )}
          </Card>

          <Card title="Histórico" className="order-5">
            <ol className="space-y-1 text-sm text-zinc-600">
              {order.events.map((e) => (
                <li key={e.id}>
                  <span className="tabular-nums text-zinc-400">
                    {dateTimeShort(e.createdAt)}
                  </span>{" "}
                  {EVENT_LABEL[e.type]}
                  {e.reason ? ` — ${e.reason}` : ""}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {editable && (
        <ActionBar
          className="lg:hidden"
          innerClassName="grid grid-cols-2 gap-2"
        >
          {order.status === "PENDENTE" ? (
            <>
              <ActionButton
                className="col-span-2 bg-emerald-600 text-white"
                onClick={() => run("accept")}
                disabled={disabled}
                loading={pendingAction === "accept"}
              >
                Aceitar pedido
              </ActionButton>
              <ActionButton
                className="border border-red-300 text-red-700"
                onClick={() => setConfirm("reject")}
                disabled={disabled}
              >
                Recusar
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton
                className="col-span-2 bg-zinc-900 text-white"
                onClick={() => run("complete")}
                disabled={disabled}
                loading={pendingAction === "complete"}
              >
                Concluir pedido
              </ActionButton>
              <ActionButton
                className="border border-red-300 text-red-700"
                onClick={() => setConfirm("cancel")}
                disabled={disabled}
              >
                Cancelar
              </ActionButton>
            </>
          )}
          <ActionButton
            className="border border-zinc-300 text-zinc-800"
            onClick={() => setEditing(true)}
            disabled={disabled}
          >
            <Pencil className="size-4" />
            Editar
          </ActionButton>
        </ActionBar>
      )}

      <Sheet open={confirm !== null} onOpenChange={(o) => !o && closeConfirm()}>
        {confirmCfg && confirm && (
          <SheetContent
            title={`${confirmCfg.title} #${order.number}?`}
            description={
              order.tab
                ? `O pedido sai da conta da comanda ${order.tab.label}.`
                : "O cliente não recebe aviso automático: depois, use “Avisar cliente no WhatsApp”."
            }
          >
            <form
              className="space-y-3 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(confirm, reason);
              }}
            >
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  {reasonRequired
                    ? "Motivo (obrigatório: o valor sai da comanda)"
                    : "Motivo (opcional, vai na mensagem ao cliente)"}
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 300))}
                  rows={3}
                  placeholder={confirmCfg.hint}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-3 text-base outline-none focus:border-zinc-900"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeConfirm}
                  disabled={disabled}
                  className="h-12 rounded-xl border border-zinc-300 font-semibold text-zinc-700 disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={disabled || (reasonRequired && !reason.trim())}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white disabled:opacity-60"
                >
                  {pendingAction === confirm && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {confirmCfg.button}
                </button>
              </div>
            </form>
          </SheetContent>
        )}
      </Sheet>

      {editable && (
        <EditOrderSheet
          open={editing}
          onOpenChange={setEditing}
          order={order}
          onSaved={(data) => {
            applyOrder(data);
            setEditing(false);
            setNotify(Boolean(data.notifyCustomerUrl));
            toast.success(
              `Pedido atualizado. Total: ${formatBRL(data.totalCents)}${
                data.deliveryFeePending ? " + entrega" : ""
              }`,
            );
          }}
          onConflict={() => {
            setEditing(false);
            void query.refetch();
          }}
        />
      )}
    </PanelPage>
  );
}

function Card({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-4 shadow-sm ${className ?? ""}`}
    >
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}

function ActionButton({
  className,
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      className={`flex h-12 items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-60 ${className ?? ""}`}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
