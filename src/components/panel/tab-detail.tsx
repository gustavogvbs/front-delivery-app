"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { OrderItemLine } from "@/components/orders/order-item-line";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { splitFieldError } from "@/lib/api-errors";
import { formatBRL, maskMoney } from "@/lib/format";
import { isApiError } from "@/lib/http";
import {
  dateTimeShort,
  elapsed,
  PAYMENT_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  timeHM,
} from "@/lib/panel-format";
import { printPreBill } from "@/lib/print";
import { bpsText } from "@/lib/service-fee";
import { cancelTab, closeTab } from "@/services/panel-api";
import type { PaymentMethod } from "@/types/api";
import type { TabDetail as Tab, TabStatus } from "@/types/panel";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Printer } from "lucide-react";
import { toast } from "sonner";

import { panelKeys, useTab } from "./use-panel";

const TAB_STATUS: Record<TabStatus, { label: string; className: string }> = {
  ABERTA: { label: "Aberta", className: "bg-sky-100 text-sky-900" },
  FECHADA: { label: "Fechada", className: "bg-emerald-100 text-emerald-900" },
  CANCELADA: { label: "Cancelada", className: "bg-zinc-200 text-zinc-700" },
};

const PAYMENTS: { key: PaymentMethod; label: string }[] = [
  { key: "DINHEIRO", label: "Dinheiro" },
  { key: "PIX", label: "Pix" },
  { key: "CARTAO", label: "Cartão" },
];

export function TabDetail({ id }: { id: string }) {
  const query = useTab(id);
  const tab = query.data;
  const [closing, setClosing] = useState(false);
  const [canceling, setCanceling] = useState(false);

  if (!tab) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        {query.isError ? (
          <>
            <p className="text-zinc-700">
              {isApiError(query.error) && query.error.status === 404
                ? "Comanda não encontrada."
                : "Não foi possível carregar a comanda."}
            </p>
            <Link
              href="/painel/mesas"
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-zinc-900 px-5 font-semibold text-white"
            >
              Voltar às mesas
            </Link>
          </>
        ) : (
          <Loader2 className="mx-auto size-6 animate-spin text-zinc-400" />
        )}
      </main>
    );
  }

  const isOpen = tab.status === "ABERTA";
  const status = TAB_STATUS[tab.status];
  // valores SEMPRE do back: prévia (aberta) ou snapshot (fechada)
  const c = tab.closing;

  return (
    <main className="mx-auto max-w-3xl space-y-3 px-4 pb-44 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/painel/mesas"
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100"
          aria-label="Voltar às mesas"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">Comanda {tab.label}</h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${status.className}`}
          data-testid="tab-status"
        >
          {status.label}
        </span>
      </div>
      <p className="text-sm text-zinc-500">
        Aberta {dateTimeShort(tab.openedAt)}
        {tab.openedBy ? ` por ${tab.openedBy}` : ""}
        {isOpen ? ` · há ${elapsed(tab.openedAt)}` : ""}
        {tab.closedAt &&
          ` · fechada ${dateTimeShort(tab.closedAt)}${tab.closedBy ? ` por ${tab.closedBy}` : ""}`}
        {tab.canceledAt &&
          ` · cancelada ${dateTimeShort(tab.canceledAt)}${tab.canceledBy ? ` por ${tab.canceledBy}` : ""}`}
      </p>

      {tab.status === "CANCELADA" && tab.cancelReason && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Motivo do cancelamento
          </h2>
          <p className="text-zinc-700">{tab.cancelReason}</p>
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Pedidos ({tab.orders.length})
        </h2>
        {tab.orders.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum pedido lançado ainda.</p>
        ) : (
          <ul className="divide-y divide-zinc-100" data-testid="tab-orders">
            {tab.orders.map((o) => (
              <li
                key={o.id}
                className={`py-3 ${o.countsInTotal ? "" : "opacity-60"}`}
              >
                <Link
                  href={`/painel/pedidos/${o.id}`}
                  className="flex min-h-11 items-center justify-between gap-2"
                >
                  <span className="font-semibold text-zinc-900">
                    #{o.number} · {timeHM(o.createdAt)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[o.status]}`}
                  >
                    {STATUS_LABEL[o.status]}
                  </span>
                </Link>
                <ul
                  className={`mt-1 space-y-1 ${o.countsInTotal ? "" : "line-through"}`}
                >
                  {o.items.map((i) => (
                    <li key={i.id}>
                      <OrderItemLine item={i} />
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <p className="mt-1 text-sm text-amber-800">Obs.: {o.notes}</p>
                )}
                <p className="mt-1 text-right text-sm text-zinc-600">
                  {o.countsInTotal
                    ? `Pedido: ${formatBRL(o.totalCents)}`
                    : "Fora da conta"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="rounded-2xl bg-white p-4 shadow-sm"
        data-testid="tab-totals"
      >
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {c ? "Conta fechada" : isOpen ? "Total parcial" : "Total"}
        </h2>
        <dl className="space-y-1 text-sm text-zinc-700">
          <Row
            label="Subtotal"
            value={formatBRL(c ? c.subtotalCents : tab.preview.subtotalCents)}
          />
          {c ? (
            c.serviceFeeCents > 0 ? (
              <Row
                label={`Taxa de serviço (${bpsText(c.serviceFeeBps)})`}
                value={formatBRL(c.serviceFeeCents)}
              />
            ) : (
              tab.serviceFee.enabled && (
                <Row label="Taxa de serviço" value="retirada" />
              )
            )
          ) : (
            tab.serviceFee.enabled && (
              <Row
                label={tab.serviceFee.label}
                value={formatBRL(tab.preview.serviceFeeCents)}
              />
            )
          )}
          <div className="flex justify-between text-base font-bold text-zinc-900">
            <dt>Total</dt>
            <dd className="tabular-nums" data-testid="tab-total">
              {formatBRL(c ? c.totalCents : tab.preview.totalCents)}
            </dd>
          </div>
          {c && (
            <Row
              label="Pagamento"
              value={`${PAYMENT_LABEL[c.paymentMethod]}${
                c.changeForCents
                  ? ` · troco para ${formatBRL(c.changeForCents)} (devolver ${formatBRL(c.changeForCents - c.totalCents)})`
                  : ""
              }`}
            />
          )}
        </dl>
      </section>

      {tab.status !== "CANCELADA" && tab.orders.length > 0 && (
        <button
          type="button"
          onClick={() => printPreBill(tab.id)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white font-semibold text-zinc-800"
        >
          <Printer className="size-5" />
          Imprimir pré-conta
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
            <Link
              href={`/painel/pedidos/novo?comanda=${tab.id}`}
              className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white"
            >
              <Plus className="size-5" />
              Adicionar pedido
            </Link>
            <button
              type="button"
              onClick={() => setClosing(true)}
              className="flex h-12 items-center justify-center rounded-xl bg-emerald-600 font-semibold text-white"
            >
              Fechar conta
            </button>
            <button
              type="button"
              onClick={() => setCanceling(true)}
              className="flex h-12 items-center justify-center rounded-xl border border-red-300 font-semibold text-red-700"
            >
              Cancelar comanda
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <>
          <CloseSheet
            tab={tab}
            open={closing}
            onOpenChange={setClosing}
            onConflict={() => void query.refetch()}
          />
          <CancelSheet
            tab={tab}
            open={canceling}
            onOpenChange={setCanceling}
            onConflict={() => void query.refetch()}
          />
        </>
      )}
    </main>
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

/**
 * Fechar conta: taxa (opcional para o cliente), forma de pagamento e troco.
 * O back recalcula tudo com a comanda travada; a Idempotency-Key é a mesma
 * enquanto a tela estiver aberta (clique duplo e nova tentativa = um fechamento).
 */
function CloseSheet({
  tab,
  open,
  onOpenChange,
  onConflict,
}: {
  tab: Tab;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConflict: () => void;
}) {
  const qc = useQueryClient();
  const [applyFee, setApplyFee] = useState(tab.serviceFee.enabled);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [change, setChange] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const key = useRef<string | null>(null);

  // nova abertura da tela = nova tentativa de fechamento
  useEffect(() => {
    if (open) {
      key.current = crypto.randomUUID();
      setApplyFee(tab.serviceFee.enabled);
      setPayment(null);
      setChange("");
      setError(null);
    }
    // só ao abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // valores do back: com taxa = prévia; sem taxa = subtotal
  const fee = tab.serviceFee.enabled && applyFee;
  const total = fee ? tab.preview.totalCents : tab.preview.subtotalCents;
  const changeCents = maskMoney(change).cents;

  const submit = async () => {
    if (busy.current || !payment || !key.current) return;
    if (payment === "DINHEIRO" && changeCents !== null && changeCents < total) {
      setError(`O troco deve ser para ${formatBRL(total)} ou mais.`);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const closed = await closeTab(
        tab.id,
        {
          paymentMethod: payment,
          ...(payment === "DINHEIRO" && changeCents !== null
            ? { changeForCents: changeCents }
            : {}),
          ...(tab.serviceFee.enabled ? { applyServiceFee: applyFee } : {}),
        },
        key.current,
      );
      qc.setQueryData(panelKeys.tab(tab.id), closed);
      void qc.invalidateQueries({ queryKey: panelKeys.tabs });
      void qc.invalidateQueries({ queryKey: panelKeys.orders });
      toast.success(
        `Conta da comanda ${closed.label} fechada: ${formatBRL(closed.closing!.totalCents)}.`,
      );
      onOpenChange(false);
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        toast.error(err.message);
        onOpenChange(false);
        onConflict();
      } else {
        setError(splitFieldError(err).message);
      }
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <SheetContent
        title={`Fechar conta · ${tab.label}`}
        description="Confira os valores com o cliente antes de confirmar."
      >
        <div className="space-y-4 p-4">
          <dl
            className="space-y-1 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700"
            data-testid="close-summary"
          >
            <Row
              label={`Subtotal (${tab.preview.validOrders} ${tab.preview.validOrders === 1 ? "pedido" : "pedidos"})`}
              value={formatBRL(tab.preview.subtotalCents)}
            />
            {tab.serviceFee.enabled && (
              <div className="flex items-center justify-between gap-3">
                <dt>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applyFee}
                      onChange={(e) => setApplyFee(e.target.checked)}
                      className="size-5 accent-zinc-900"
                    />
                    {tab.serviceFee.label}
                  </label>
                </dt>
                <dd className="tabular-nums">
                  {applyFee
                    ? formatBRL(tab.preview.serviceFeeCents)
                    : "retirada"}
                </dd>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-zinc-900">
              <dt>Total</dt>
              <dd className="tabular-nums" data-testid="close-total">
                {formatBRL(total)}
              </dd>
            </div>
          </dl>

          <fieldset>
            <legend className="font-semibold text-zinc-900">Pagamento</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={payment === p.key}
                  onClick={() => setPayment(p.key)}
                  className={`h-12 rounded-xl border text-sm font-semibold ${
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
                  className="mt-1 h-12 w-full rounded-xl border border-zinc-300 px-3 text-base tabular-nums"
                />
                {changeCents !== null && changeCents >= total && (
                  <span
                    className="mt-1 block text-sm font-semibold text-zinc-900"
                    data-testid="change-back"
                  >
                    Devolver {formatBRL(changeCents - total)}
                  </span>
                )}
              </label>
            )}
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!payment || saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
          >
            {saving && <Loader2 className="size-5 animate-spin" />}
            Confirmar fechamento · {formatBRL(total)}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Cancelar comanda: motivo obrigatório; cancela os pedidos ativos dela. */
function CancelSheet({
  tab,
  open,
  onOpenChange,
  onConflict,
}: {
  tab: Tab;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConflict: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current || !reason.trim()) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const canceled = await cancelTab(tab.id, reason.trim());
      qc.setQueryData(panelKeys.tab(tab.id), canceled);
      void qc.invalidateQueries({ queryKey: panelKeys.tabs });
      void qc.invalidateQueries({ queryKey: panelKeys.orders });
      toast.success(`Comanda ${canceled.label} cancelada.`);
      setReason("");
      onOpenChange(false);
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        toast.error(err.message);
        onOpenChange(false);
        onConflict();
      } else {
        setError(splitFieldError(err).message);
      }
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <SheetContent
        title={`Cancelar comanda ${tab.label}?`}
        description="Os pedidos ainda ativos da comanda também são cancelados. Não dá para desfazer."
      >
        <form onSubmit={submit} className="space-y-3 p-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">
              Motivo (obrigatório)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="Ex.: aberta por engano, cliente foi embora…"
              className="mt-1 w-full rounded-xl border border-zinc-300 p-3 text-base outline-none focus:border-zinc-900"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-12 rounded-xl border border-zinc-300 font-semibold text-zinc-700 disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={saving || !reason.trim()}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Cancelar comanda
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
