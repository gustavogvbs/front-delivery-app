import { useEffect, useState } from "react";

/**
 * Ponte com o app desktop da loja (Electron, repositório boapedida-desktop).
 * `window.desktop` só existe dentro do app; no navegador comum é undefined e
 * o painel funciona exatamente como antes. O app recebe só IDs e a via,
 * nunca o conteúdo do pedido: ele monta a URL da página da bobina.
 */
export type PrintVia = "cozinha" | "entrega" | "ambas";

export type DesktopPrintJob =
  | { tipo: "pedido"; id: string; via: PrintVia }
  | { tipo: "pre-conta"; id: string }
  | { tipo: "teste"; via?: PrintVia };

export interface DesktopBridge {
  isDesktop: true;
  versao(): Promise<string>;
  imprimir(job: DesktopPrintJob): Promise<{ ok: boolean; erro?: string }>;
  listarImpressoras(): Promise<{ nome: string; padrao: boolean }[]>;
  abrirConfiguracoes(): void;
  /** pedido online pendente novo (os mesmos que tocam o som) */
  notificarPedidoNovo(p: { id: string; numero: number }): void;
  /** estado para a atualização automática: só reinicia com a loja fechada e sem pedidos em andamento */
  informarEstado(e: { lojaAberta: boolean; pendentes: number }): void;
  /** atualização do app baixada? (opcional: versões antigas do app não têm) */
  atualizacao?(): Promise<{ pronta: boolean; versao: string | null } | null>;
  aoAtualizacaoPronta?(cb: (versao: string) => void): () => void;
  /** "reiniciar agora": instala a atualização baixada */
  reiniciarParaAtualizar?(): void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

/** A ponte, se o painel estiver aberto no app desktop. */
export function getDesktop(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const d = window.desktop;
  return d && d.isDesktop === true ? d : null;
}

/**
 * true dentro do app desktop. Começa false e só muda depois de montar: o
 * HTML do servidor é o mesmo do navegador comum (sem diferença na hidratação).
 */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => setDesktop(getDesktop() !== null), []);
  return desktop;
}

/** Versão da atualização do app já baixada (null = nenhuma ou fora do app). */
export function useDesktopUpdate(): string | null {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    const d = getDesktop();
    if (!d?.atualizacao) return;
    let alive = true;
    void d.atualizacao().then((s) => {
      if (alive && s?.pronta) setVersion(s.versao ?? "nova");
    });
    const stop = d.aoAtualizacaoPronta?.((v) => setVersion(v));
    return () => {
      alive = false;
      stop?.();
    };
  }, []);
  return version;
}
