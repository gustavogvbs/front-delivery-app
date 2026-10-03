"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { usePanelOrder, usePanelTenant } from "@/components/panel/use-panel";
import type { PrintCopy } from "@/lib/print";
import { markPrintReady } from "@/lib/print-ready";
import type { PanelOrder } from "@/types/panel";

import { OrderTicket, ticketCss } from "./order-ticket";

const COPIES: PrintCopy[] = ["cozinha", "entrega", "ambas"];

/** Pedido de exemplo para o "Imprimir teste" das configurações. */
function sampleOrder(): PanelOrder {
  const now = new Date().toISOString();
  return {
    id: "teste",
    number: 123,
    status: "ACEITO",
    createdAt: now,
    updatedAt: now,
    editedAt: null,
    customer: { name: "Cliente de Teste", phone: "5515999990000" },
    source: "MANUAL",
    deliveryType: "ENTREGA",
    tableLabel: null,
    tab: null,
    address: {
      cep: "18030000",
      street: "Rua de Teste",
      number: "100",
      complement: "Apto 12",
      neighborhood: "Centro",
      city: "Sorocaba",
      state: "SP",
      reference: "Portão azul",
    },
    location: null,
    distanceMeters: 2100,
    deliveryFeeCents: 500,
    deliveryFeePending: false,
    paymentMethod: "DINHEIRO",
    changeForCents: 10000,
    notes: "Impressão de teste",
    items: [
      {
        id: "1",
        productId: null,
        productName: "X-Burger",
        unitPriceCents: 2490,
        quantity: 2,
        notes: "sem cebola",
        totalCents: 4980,
      },
      {
        id: "2",
        productId: null,
        productName: "Refrigerante Lata",
        unitPriceCents: 600,
        quantity: 1,
        notes: null,
        totalCents: 600,
      },
    ],
    subtotalCents: 5580,
    totalCents: 6080,
    rejectionReason: null,
    cancellationReason: null,
    events: [],
    notifyCustomerUrl: null,
  };
}

/**
 * Página da bobina: /painel/pedidos/[id]/imprimir?via=cozinha|entrega|ambas
 * &largura=58|80&embed=1. Embutida (iframe do painel), imprime sozinha e avisa
 * o pai; aberta direto, mostra uma barra (fora da impressão) para pré-visualizar.
 */
export function PrintView({ id }: { id: string }) {
  const params = useSearchParams();
  const embed = params.get("embed") === "1";
  const isSample = id === "teste";
  const tenant = usePanelTenant();
  const query = usePanelOrder(id, !isSample);
  const order = isSample ? sampleOrder() : query.data;

  const [copy, setCopy] = useState<PrintCopy>(
    (COPIES as string[]).includes(params.get("via") ?? "")
      ? (params.get("via") as PrintCopy)
      : "cozinha",
  );
  const widthParam = Number(params.get("largura"));
  const width: 58 | 80 =
    widthParam === 58 || widthParam === 80
      ? widthParam
      : tenant.data?.printPaperWidth ?? 80;

  // altura da página = altura do conteúdo (a bobina não gasta papel em branco)
  const ticketRef = useRef<HTMLDivElement>(null);
  const [pageCss, setPageCss] = useState("");
  const ready = Boolean(order && tenant.data);
  useEffect(() => {
    if (!ready || !ticketRef.current) return;
    const px = ticketRef.current.getBoundingClientRect().height;
    const mm = Math.ceil((px * 25.4) / 96) + 4;
    setPageCss(`@page { size: ${width}mm ${mm}mm; margin: 0; }`);
    markPrintReady(width, mm);
  }, [ready, width, copy, order]);

  // embutida: imprime quando estiver pronta e avisa o painel
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
        {query.isError ? "Pedido não encontrado." : "Carregando…"}
      </p>
    );
  }

  return (
    <>
      <style>{ticketCss(width) + pageCss}</style>
      {!embed && (
        <div className="no-print mx-auto mb-4 flex max-w-md flex-wrap items-center gap-2 p-3 text-sm">
          <Link
            href={isSample ? "/painel/loja/impressao" : `/painel/pedidos/${id}`}
            className="h-11 rounded-xl border border-zinc-300 px-3 leading-[2.75rem]"
          >
            Voltar
          </Link>
          <select
            value={copy}
            onChange={(e) => setCopy(e.target.value as PrintCopy)}
            className="h-11 rounded-xl border border-zinc-300 px-2"
            aria-label="Via"
          >
            <option value="cozinha">Via da cozinha</option>
            <option value="entrega">Via de entrega/cliente</option>
            <option value="ambas">As duas vias</option>
          </select>
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
        <OrderTicket order={order!} storeName={tenant.data!.name} copy={copy} />
      </div>
    </>
  );
}
