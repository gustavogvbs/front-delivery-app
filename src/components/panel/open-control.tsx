"use client";

import type { PanelTenant } from "@/types/panel";

import { openSourceText } from "./open-flow";

/**
 * Linha informativa do estado da loja (Loja → Horários), sem botões: abrir
 * e fechar ficam só no topo do painel (pílula de status).
 */
export function OpenStatusLine({ tenant }: { tenant: PanelTenant }) {
  const open = tenant.openStatus.isOpen;
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 rounded-xl px-3 py-2 text-sm ${
        open ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
      }`}
    >
      <span
        aria-hidden
        className={`size-2.5 rounded-full ${open ? "bg-emerald-500" : "bg-red-600"}`}
      />
      <strong data-testid="store-open-state">
        {open ? "Loja aberta" : "Loja fechada"}
      </strong>
      <span data-testid="store-open-source">{openSourceText(tenant)}</span>
      <span className="text-zinc-600">
        Para abrir ou fechar agora, use o botão de status no topo.
      </span>
    </p>
  );
}
