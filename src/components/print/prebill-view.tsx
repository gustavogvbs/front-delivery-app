"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { OrderItemLine } from "@/components/orders/order-item-line";
import { usePanelTenant, useTab } from "@/components/panel/use-panel";
import { formatBRL } from "@/lib/format";
import { dateTimeShort, PAYMENT_LABEL, timeHM } from "@/lib/panel-format";
import { bpsText } from "@/lib/service-fee";
import type { TabDetail } from "@/types/panel";

import { ticketCss } from "./order-ticket";

/**
 * Pré-conta da comanda na bobina (58/80 mm): itens com preço, subtotal, taxa
 * de serviço (opcional) e total, com aviso claro de que NÃO é comprovante de
 * pagamento. Página: /painel/mesas/[id]/imprimir (&embed=1 no iframe).
 */
export function PreBillView({ id }: { id: string }) {
  const params = useSearchParams();
  const embed = params.get("embed") === "1";
  const tenant = usePanelTenant();
  const query = useTab(id);
  const tab = query.data;
  const width: 58 | 80 = tenant.data?.printPaperWidth ?? 80;

  const ticketRef = useRef<HTMLDivElement>(null);
  const [pageCss, setPageCss] = useState("");
  const ready = Boolean(tab && tenant.data);
  useEffect(() => {
    if (!ready || !ticketRef.current) return;
    const px = ticketRef.current.getBoundingClientRect().height;
    const mm = Math.ceil((px * 25.4) / 96) + 4;
    setPageCss(`@page { size: ${width}mm ${mm}mm; margin: 0; }`);
  }, [ready, width, tab]);

  const printed = useRef(false);
  useEffect(() => {
    if (!embed || !ready || !pageCss || printed.current) return;
    printed.current = true;
    requestAnimationFrame(() => {
      window.print();
      window.parent?.postMessage("print:done", window.location.origin);
    });
  }, [embed, ready, pageCss]);

  if (!ready) {
    return (
      <p className="no-print p-4 text-sm text-zinc-500">
        {query.isError ? "Comanda não encontrada." : "Carregando…"}
      </p>
    );
  }

  return (
    <>
      <style>{ticketCss(width) + pageCss}</style>
      {!embed && (
        <div className="no-print mx-auto mb-4 flex max-w-md flex-wrap items-center gap-2 p-3 text-sm">
          <Link
            href={`/painel/mesas/${id}`}
            className="h-11 rounded-xl border border-zinc-300 px-3 leading-[2.75rem]"
          >
            Voltar
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-11 rounded-xl bg-zinc-900 px-4 font-semibold text-white"
          >
            Imprimir
          </button>
          <span className="text-zinc-500">Bobina de {width} mm</span>
        </div>
      )}
      <div ref={ticketRef} style={{ width: `${width}mm`, margin: "0 auto" }}>
        <PreBillTicket tab={tab!} storeName={tenant.data!.name} />
      </div>
    </>
  );
}

function PreBillTicket({
  tab,
  storeName,
}: {
  tab: TabDetail;
  storeName: string;
}) {
  // valores SEMPRE do back: snapshot (fechada) ou prévia (aberta)
  const c = tab.closing;
  const subtotal = c ? c.subtotalCents : tab.preview.subtotalCents;
  const feeCents = c ? c.serviceFeeCents : tab.preview.serviceFeeCents;
  const total = c ? c.totalCents : tab.preview.totalCents;
  const showFee = c ? c.serviceFeeCents > 0 : tab.serviceFee.enabled;
  const feeLabel = c
    ? `Taxa de serviço (${bpsText(c.serviceFeeBps)})`
    : tab.serviceFee.label;
  const orders = tab.orders.filter((o) => o.countsInTotal);

  return (
    <div className="ticket" data-testid="prebill">
      <div className="t-store">{storeName}</div>
      <div className="t-copy">PRÉ-CONTA</div>
      <div className="t-type">{tab.label}</div>
      <div className="t-time">
        Aberta {dateTimeShort(tab.openedAt)} · impressa{" "}
        {dateTimeShort(new Date().toISOString())}
      </div>
      {orders.map((o) => (
        <div className="t-section" key={o.id}>
          <div className="t-label">
            Pedido #{o.number} · {timeHM(o.createdAt)}
          </div>
          {o.items.map((i) => (
            <OrderItemLine key={i.id} item={i} variant="print" />
          ))}
        </div>
      ))}
      <div className="t-section">
        <div className="t-row">
          <span>Subtotal</span>
          <span>{formatBRL(subtotal)}</span>
        </div>
        {showFee && (
          <div className="t-row">
            <span>{feeLabel}</span>
            <span>{formatBRL(feeCents)}</span>
          </div>
        )}
        <div className="t-row t-total">
          <span>TOTAL</span>
          <span>{formatBRL(total)}</span>
        </div>
        {showFee && !c && (
          <div className="t-row">
            <span>Total sem a taxa</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
        )}
        {c && <div>Pagamento: {PAYMENT_LABEL[c.paymentMethod]}</div>}
      </div>
      <div className="t-section">
        <div className="t-notes" data-testid="prebill-warning">
          PRÉ-CONTA · NÃO É COMPROVANTE DE PAGAMENTO
        </div>
      </div>
    </div>
  );
}
