import { useCallback, useEffect, useState } from "react";

import type { PanelTenant } from "@/types/panel";
import { toast } from "sonner";

import {
  type DesktopBridge,
  type DesktopPrintJob,
  getDesktop,
} from "./desktop";
import { readText, writeText } from "./storage";

/**
 * Impressão térmica pelo navegador (fase 1).
 *
 * - A largura (58/80 mm) e as vias padrão são da LOJA (banco).
 * - A impressão AUTOMÁTICA é do APARELHO (localStorage): o painel pode estar
 *   aberto no computador do balcão (com a impressora) e no celular do dono;
 *   só o aparelho com a opção ligada imprime sozinho.
 * - Sempre a partir de um clique (aceitar/confirmar): um iframe oculto carrega
 *   a página da bobina e chama print(). Com o Chrome em --kiosk-printing, sai
 *   direto na impressora padrão, sem a janela de diálogo.
 * - No APP DESKTOP (window.desktop), quem imprime é o app: ele abre a mesma
 *   página da bobina numa janela oculta e imprime em silêncio na impressora
 *   escolhida no app. As telas não sabem qual caminho foi usado.
 */
export type PrintCopy = "cozinha" | "entrega" | "ambas";
export type AutoPrintKind = "accept" | "manual";

const PREF_KEYS: Record<AutoPrintKind, string> = {
  accept: "print:auto-accept",
  manual: "print:auto-manual",
};

export const readAutoPrint = (kind: AutoPrintKind) =>
  readText("local", PREF_KEYS[kind]) === "on";

/** Preferências de impressão automática deste aparelho. */
export function useAutoPrintPrefs() {
  const [prefs, setPrefs] = useState({ accept: false, manual: false });
  useEffect(() => {
    setPrefs({
      accept: readAutoPrint("accept"),
      manual: readAutoPrint("manual"),
    });
  }, []);
  const set = useCallback((kind: AutoPrintKind, on: boolean) => {
    writeText("local", PREF_KEYS[kind], on ? "on" : "off");
    setPrefs((p) => ({ ...p, [kind]: on }));
  }, []);
  return { prefs, set };
}

/** Vias padrão da loja → o que imprimir; null = nenhuma via marcada. */
export function copiesFor(
  t: Pick<PanelTenant, "printKitchenCopy" | "printDeliveryCopy">,
): PrintCopy | null {
  if (t.printKitchenCopy && t.printDeliveryCopy) return "ambas";
  if (t.printKitchenCopy) return "cozinha";
  if (t.printDeliveryCopy) return "entrega";
  return null;
}

export const printUrl = (orderId: string, copy: PrintCopy, width?: 58 | 80) =>
  `/painel/pedidos/${encodeURIComponent(orderId)}/imprimir?via=${copy}${
    width ? `&largura=${width}` : ""
  }&embed=1`;

/**
 * Imprime as vias do pedido ("teste" = pedido de exemplo das configurações).
 * Navegador: página da bobina num iframe oculto (preso ao document.body:
 * sobrevive à navegação do painel), que chama print() quando carrega.
 * App desktop: pela ponte. Devolve se a impressão foi enviada.
 */
export function printOrder(orderId: string, copy: PrintCopy): Promise<boolean> {
  const desktop = getDesktop();
  if (desktop)
    return printOnDesktop(
      desktop,
      orderId === "teste"
        ? { tipo: "teste", via: copy }
        : { tipo: "pedido", id: orderId, via: copy },
    );
  printInFrame(printUrl(orderId, copy), "Impressão do pedido");
  return Promise.resolve(true);
}

/** Pré-conta da comanda (NÃO é comprovante de pagamento), na bobina da loja. */
export const preBillUrl = (tabId: string) =>
  `/painel/mesas/${encodeURIComponent(tabId)}/imprimir?embed=1`;

export function printPreBill(tabId: string): Promise<boolean> {
  const desktop = getDesktop();
  if (desktop) return printOnDesktop(desktop, { tipo: "pre-conta", id: tabId });
  printInFrame(preBillUrl(tabId), "Impressão da pré-conta");
  return Promise.resolve(true);
}

/** Impressão pelo app; erro (impressora sumiu, sessão expirou…) vira aviso. */
async function printOnDesktop(
  desktop: DesktopBridge,
  job: DesktopPrintJob,
): Promise<boolean> {
  try {
    const res = await desktop.imprimir(job);
    if (!res.ok)
      toast.error(res.erro ?? "Não foi possível imprimir.", {
        duration: 10_000,
      });
    return res.ok;
  } catch {
    toast.error(
      "O app não conseguiu imprimir. Confira a impressora nas configurações do app.",
      { duration: 10_000 },
    );
    return false;
  }
}

function printInFrame(src: string, title: string) {
  if (typeof document === "undefined") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = title;
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  const cleanup = () => {
    window.removeEventListener("message", onMessage);
    frame.remove();
  };
  const onMessage = (e: MessageEvent) => {
    if (e.source === frame.contentWindow && e.data === "print:done") {
      setTimeout(cleanup, 500);
    }
  };
  window.addEventListener("message", onMessage);
  setTimeout(cleanup, 120_000); // garantia
  frame.src = src;
  document.body.appendChild(frame);
}

/**
 * Impressão automática (depois de aceitar/registrar), se ligada NESTE aparelho.
 * Sem via marcada na loja: não imprime e avisa.
 */
export function autoPrint(
  tenant: Pick<PanelTenant, "printKitchenCopy" | "printDeliveryCopy">,
  orderId: string,
  kind: AutoPrintKind,
): Promise<boolean> {
  if (!readAutoPrint(kind)) return Promise.resolve(false);
  const copy = copiesFor(tenant);
  if (!copy) {
    toast.warning(
      "Impressão automática ligada, mas nenhuma via está marcada. Escolha em Loja → Impressão.",
    );
    return Promise.resolve(false);
  }
  return printOrder(orderId, copy);
}
