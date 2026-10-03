"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { PanelTenant } from "@/types/panel";
import { ChevronDown, Clock, Loader2 } from "lucide-react";

import { openSourceText, storeStatusText, useOpenFlow } from "./open-flow";

/** true a partir da largura indicada (padrão: tablet, 768 px). */
export function useMinWidth(px = 768) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [px]);
  return match;
}

/**
 * Pílula de status no topo do painel, sempre à vista. Fechada = vermelha
 * (contraste forte) em todos os formatos. Ao tocar: detalhes e ações
 * (popover no tablet/desktop, folha no celular).
 */
export function StoreStatus({ tenant }: { tenant: PanelTenant }) {
  const flow = useOpenFlow(tenant);
  const wide = useMinWidth(768);
  const [panel, setPanel] = useState(false);
  const text = storeStatusText(tenant);

  const pill = (
    <button
      type="button"
      onClick={() => setPanel(true)}
      aria-label={`Status da loja: ${text.full}. Abrir ou fechar`}
      data-testid="store-status"
      data-open={flow.open ? "true" : "false"}
      className={`flex h-11 min-w-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${
        flow.open
          ? "bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-300"
          : "bg-red-600 text-white shadow-sm ring-2 ring-inset ring-red-700"
      }`}
    >
      <span
        aria-hidden
        className={`size-2.5 shrink-0 rounded-full ${
          flow.open ? "bg-emerald-500" : "animate-pulse bg-white"
        }`}
      />
      <span className="truncate md:hidden">{text.short}</span>
      <span className="hidden truncate md:inline">{text.full}</span>
      {flow.busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <ChevronDown className="size-4 shrink-0 opacity-80" />
      )}
    </button>
  );

  const details = (
    <StatusDetails
      tenant={tenant}
      flow={flow}
      onAction={() => setPanel(false)}
    />
  );

  return (
    <>
      {wide ? (
        <Popover open={panel} onOpenChange={setPanel}>
          <PopoverTrigger asChild>{pill}</PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80 rounded-2xl p-0"
            aria-label="Status da loja"
          >
            {details}
          </PopoverContent>
        </Popover>
      ) : (
        <>
          {pill}
          <Sheet open={panel} onOpenChange={setPanel}>
            <SheetContent title="Status da loja">{details}</SheetContent>
          </Sheet>
        </>
      )}
      {flow.dialogs}
    </>
  );
}

function StatusDetails({
  tenant,
  flow,
  onAction,
}: {
  tenant: PanelTenant;
  flow: ReturnType<typeof useOpenFlow>;
  onAction: () => void;
}) {
  const open = flow.open;
  return (
    <div className="space-y-3 p-4">
      <div>
        <p
          className={`text-lg font-bold ${open ? "text-emerald-800" : "text-red-700"}`}
          data-testid="store-status-title"
        >
          {open ? "Loja aberta" : "Loja fechada"}
        </p>
        <p className="text-sm text-zinc-700">{openSourceText(tenant)}</p>
        <p className="mt-1 text-sm text-zinc-500">
          {open
            ? "Os clientes podem fazer pedidos agora."
            : "O cardápio continua visível, mas ninguém consegue pedir."}
        </p>
      </div>
      <button
        type="button"
        disabled={flow.busy}
        onClick={() => {
          onAction();
          flow.toggle();
        }}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-60 ${
          open ? "bg-red-600" : "bg-emerald-600"
        }`}
      >
        {flow.opening && <Loader2 className="size-5 animate-spin" />}
        {flow.mainLabel}
      </button>
      {flow.closeHint && (
        <p className="text-center text-xs text-zinc-600">{flow.closeHint}</p>
      )}
      {flow.hasOverride && (
        <button
          type="button"
          disabled={flow.busy}
          onClick={() => {
            onAction();
            flow.backToAuto();
          }}
          className="h-11 w-full rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-800 disabled:opacity-60"
        >
          {flow.clearing ? "Voltando…" : "Voltar ao automático"}
        </button>
      )}
      <Link
        href="/painel/loja/horarios"
        onClick={onAction}
        className="flex h-11 items-center justify-center gap-1.5 text-sm font-medium text-zinc-600 underline"
      >
        <Clock className="size-4" />
        Horários de funcionamento
      </Link>
    </div>
  );
}
