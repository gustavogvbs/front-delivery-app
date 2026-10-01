"use client";

import { useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { whenText } from "@/lib/opening";
import type { PanelTenant } from "@/types/panel";
import { Loader2 } from "lucide-react";

import { useClearOpenOverride, useSetStoreOpen } from "./use-panel";

/** Texto da origem do estado: "Pelo horário · fecha hoje 23:00" etc. */
export function openSourceText(t: PanelTenant): string {
  const s = t.openStatus;
  const when = s.changesAt ? whenText(s.changesAt, t.timeZone) : null;
  if (s.source === "MANUAL") return "Modo manual: só muda pelo botão.";
  if (s.source === "AJUSTE") {
    return s.isOpen
      ? `Aberto manualmente até ${when}.`
      : `Fechado manualmente até ${when}.`;
  }
  if (!when)
    return s.isOpen ? "Pelo horário." : "Pelo horário: sem próxima abertura.";
  return s.isOpen
    ? `Pelo horário · fecha ${when}.`
    : `Pelo horário · abre ${when}.`;
}

/**
 * Botão de abrir/fechar a loja (aba Loja e aviso do topo do painel).
 * - Manual: abre/fecha direto.
 * - Automático: "Fechar agora" fecha até a próxima abertura programada;
 *   "Abrir agora" pergunta até quando (1–3 h, fechamento de hoje ou horário),
 *   no máximo 12 h. O back valida.
 */
export function OpenControl({
  tenant,
  variant,
}: {
  tenant: PanelTenant;
  variant: "card" | "banner";
}) {
  const setOpen = useSetStoreOpen();
  const clear = useClearOpenOverride();
  const [choosing, setChoosing] = useState(false);
  const auto = tenant.openingMode === "AUTOMATICO";
  const open = tenant.openStatus.isOpen;
  const busy = setOpen.isPending || clear.isPending;

  const onMain = () => {
    if (busy) return;
    // manual, fechar, ou reabrir quando o horário já está aberto (só tira o
    // "Fechar agora"): direto. Abrir fora do horário: pergunta até quando.
    if (open || !auto || tenant.openNowOptions?.scheduleOpen)
      setOpen.mutate({ open: !open });
    else setChoosing(true);
  };
  const mainLabel = open
    ? auto
      ? "Fechar agora"
      : "Fechar a loja"
    : auto
      ? "Abrir agora"
      : "Abrir a loja";

  const closeHint =
    auto && open && tenant.openNowOptions?.closeUntil
      ? `Fecha até ${whenText(tenant.openNowOptions.closeUntil, tenant.timeZone)} (próxima abertura).`
      : null;

  const backToAuto =
    tenant.openStatus.source === "AJUSTE" ? (
      <button
        type="button"
        onClick={() => clear.mutate()}
        disabled={busy}
        className="h-11 rounded-xl px-3 text-sm font-semibold text-zinc-700 underline disabled:opacity-60"
      >
        {clear.isPending ? "Voltando…" : "Voltar ao automático"}
      </button>
    ) : null;

  const sheet = auto && tenant.openNowOptions && (
    <OpenNowSheet
      open={choosing}
      onOpenChange={setChoosing}
      tenant={tenant}
      pending={setOpen.isPending}
      onChoose={(until) =>
        setOpen.mutate(
          { open: true, until },
          { onSuccess: () => setChoosing(false) },
        )
      }
    />
  );

  if (variant === "banner") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 bg-red-50 px-4 py-2 text-sm text-red-800">
        <span>
          <strong>{tenant.openStatus.label}</strong>
          <span className="block text-xs text-red-700">
            Os clientes não conseguem pedir ·{" "}
            {tenant.openStatus.source === "MANUAL"
              ? "modo manual"
              : tenant.openStatus.source === "AJUSTE"
                ? "fechado manualmente"
                : "pelo horário"}
          </span>
        </span>
        <span className="flex items-center gap-1">
          {backToAuto}
          <button
            type="button"
            onClick={onMain}
            disabled={busy}
            className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-red-600 px-3 font-semibold text-white disabled:opacity-60"
          >
            {setOpen.isPending && <Loader2 className="size-4 animate-spin" />}
            {/* no aviso do topo a loja está fechada: sempre "Abrir agora" */}
            Abrir agora
          </button>
        </span>
        {sheet}
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border-2 p-4 ${
        open ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50"
      }`}
    >
      <p
        className={`text-lg font-bold ${open ? "text-emerald-900" : "text-red-900"}`}
        data-testid="store-open-state"
      >
        {open ? "Loja aberta" : "Loja fechada"}
      </p>
      <p className="text-sm text-zinc-700" data-testid="store-open-source">
        {openSourceText(tenant)}
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        {open
          ? "Os clientes podem fazer pedidos agora."
          : "O cardápio continua visível, mas ninguém consegue pedir."}
      </p>
      <button
        type="button"
        onClick={onMain}
        disabled={busy}
        className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-60 ${
          open ? "bg-red-600" : "bg-emerald-600"
        }`}
      >
        {setOpen.isPending && <Loader2 className="size-5 animate-spin" />}
        {mainLabel}
      </button>
      {closeHint && (
        <p className="mt-1 text-center text-xs text-zinc-600">{closeHint}</p>
      )}
      {backToAuto && <div className="mt-1 text-center">{backToAuto}</div>}
      {sheet}
    </section>
  );
}

const HOUR = 3_600_000;

/** Próxima ocorrência de "HH:MM" no horário do aparelho (hoje ou amanhã). */
function nextOccurrence(value: string, now: Date): Date | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(now);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

function OpenNowSheet({
  open,
  onOpenChange,
  tenant,
  pending,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: PanelTenant;
  pending: boolean;
  onChoose: (untilIso: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const options = tenant.openNowOptions!;
  const tz = tenant.timeZone;
  const maxUntil = new Date(options.maxUntil);

  const choose = (until: Date) => {
    if (pending) return;
    setError(null);
    if (until.getTime() > maxUntil.getTime()) {
      setError(
        `No máximo 12 horas a partir de agora (até ${whenText(options.maxUntil, tz)}).`,
      );
      return;
    }
    onChoose(until.toISOString());
  };

  const quick = [1, 2, 3].map((h) => ({
    label: `Por ${h} hora${h > 1 ? "s" : ""}`,
    until: () => new Date(Date.now() + h * HOUR),
  }));

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!pending) onOpenChange(o);
      }}
    >
      <SheetContent
        title="Abrir agora até quando?"
        description="Depois desse horário, a loja volta a seguir os horários sozinha."
      >
        <div className="space-y-2 p-4">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={pending}
              onClick={() => choose(q.until())}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-zinc-300 px-4 text-left font-semibold text-zinc-800 disabled:opacity-60"
            >
              {q.label}
              <span className="text-sm font-normal text-zinc-500">
                até {whenText(q.until().toISOString(), tz)}
              </span>
            </button>
          ))}
          {options.todayClose && (
            <button
              type="button"
              disabled={pending}
              onClick={() => choose(new Date(options.todayClose!))}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-emerald-500 bg-emerald-50 px-4 text-left font-semibold text-emerald-900 disabled:opacity-60"
            >
              Até o fechamento normal de hoje
              <span className="text-sm font-normal">
                {whenText(options.todayClose, tz)}
              </span>
            </button>
          )}
          <div className="rounded-xl border border-zinc-300 p-3">
            <label
              className="block text-sm font-medium text-zinc-700"
              htmlFor="open-until"
            >
              Até um horário
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="open-until"
                type="time"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="h-12 min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 text-base"
              />
              <button
                type="button"
                disabled={pending || !custom}
                onClick={() => {
                  const until = nextOccurrence(custom, new Date());
                  if (until) choose(until);
                }}
                className="h-12 shrink-0 rounded-xl bg-zinc-900 px-4 font-semibold text-white disabled:opacity-50"
              >
                Abrir
              </button>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          {pending && (
            <p className="flex items-center justify-center gap-2 text-sm text-zinc-600">
              <Loader2 className="size-4 animate-spin" /> Abrindo…
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
