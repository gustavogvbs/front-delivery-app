"use client";

import { useEffect, useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { copiesFor, printOrder, printUrl, type PrintCopy } from "@/lib/print";
import { readText, writeText } from "@/lib/storage";
import type { PanelTenant } from "@/types/panel";
import { Printer } from "lucide-react";
import { toast } from "sonner";

const printedKey = (id: string) => `printed:${id}`;
const PRINTED_EVENT = "panel:printed";

/** Marca o pedido como impresso e avisa os botões já na tela (ex.: impressão automática ao aceitar). */
export function markPrinted(id: string) {
  writeText("session", printedKey(id), "1");
  window.dispatchEvent(new CustomEvent(PRINTED_EVENT, { detail: id }));
}

/**
 * "Já impresso" deste pedido (nesta sessão do navegador): a mesma marca vale
 * para o botão do detalhe do pedido e a impressão rápida da comanda.
 */
export function usePrintedMark(orderId: string) {
  const [printed, setPrinted] = useState(false);
  // lido depois de montar (o servidor não tem sessionStorage)
  useEffect(() => {
    setPrinted(readText("session", printedKey(orderId)) === "1");
    const onPrinted = (e: Event) => {
      if ((e as CustomEvent<string>).detail === orderId) setPrinted(true);
    };
    window.addEventListener(PRINTED_EVENT, onPrinted);
    return () => window.removeEventListener(PRINTED_EVENT, onPrinted);
  }, [orderId]);
  const mark = () => markPrinted(orderId);
  return { printed, mark };
}

/**
 * Impressão rápida (detalhe da comanda): SEMPRE a via da cozinha, sem
 * perguntar, na largura configurada da loja.
 */
export function QuickKitchenPrint({
  orderId,
  number,
}: {
  orderId: string;
  number: number;
}) {
  const { printed, mark } = usePrintedMark(orderId);
  return (
    <button
      type="button"
      onClick={() => {
        void printOrder(orderId, "cozinha").then((ok) => {
          if (!ok) return; // o erro já virou aviso
          mark();
          toast.success(`Enviado para impressão · #${number}`, {
            description: "Via da cozinha",
          });
        });
      }}
      aria-label={`${printed ? "Reimprimir" : "Imprimir"} via da cozinha do pedido #${number}`}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 active:bg-zinc-100"
      data-testid="quick-print"
    >
      <Printer className="size-4" />
      {printed ? "Reimprimir" : "Imprimir"}
    </button>
  );
}

const OPTIONS: { copy: PrintCopy; label: string }[] = [
  { copy: "cozinha", label: "Via da cozinha (sem preços)" },
  { copy: "entrega", label: "Via de entrega / cliente" },
  { copy: "ambas", label: "As duas vias" },
];

/** "Imprimir" / "Reimprimir" no detalhe do pedido, escolhendo a via. */
export function PrintButton({
  orderId,
  tenant,
}: {
  orderId: string;
  tenant: PanelTenant;
}) {
  const [open, setOpen] = useState(false);
  const { printed, mark } = usePrintedMark(orderId);
  const standard = copiesFor(tenant);

  const print = (copy: PrintCopy) => {
    setOpen(false);
    void printOrder(orderId, copy).then((ok) => ok && mark());
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800"
      >
        <Printer className="size-4" />
        {printed ? "Reimprimir" : "Imprimir"}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          title={printed ? "Reimprimir pedido" : "Imprimir pedido"}
          description={`Bobina de ${tenant.printPaperWidth} mm. Para mudar, vá em Loja → Impressão.`}
        >
          <div className="space-y-2 p-4">
            {OPTIONS.map((o) => (
              <button
                key={o.copy}
                type="button"
                onClick={() => print(o.copy)}
                className={`flex h-12 w-full items-center justify-between rounded-xl border px-4 text-left font-semibold ${
                  o.copy === standard
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 text-zinc-800"
                }`}
              >
                {o.label}
                {o.copy === standard && (
                  <span className="text-xs font-normal">padrão da loja</span>
                )}
              </button>
            ))}
            <a
              href={printUrl(orderId, standard ?? "cozinha").replace(
                "&embed=1",
                "",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 text-center text-sm text-zinc-600 underline"
            >
              Ver prévia da impressão
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
