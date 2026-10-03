"use client";

import { useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { whenText } from "@/lib/opening";
import type { PanelTenant } from "@/types/panel";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";

import { useClearOpenOverride, useSetStoreOpen } from "./use-panel";

/** "hoje 23:00" → "23:00" (o resto fica: "amanhã 11:00", "seg 11:00"). */
const shortWhen = (iso: string, tz: string) =>
  whenText(iso, tz).replace(/^hoje /, "");

/**
 * Texto do estado da loja para o topo do painel. `full` no tablet/desktop e
 * no detalhe; `short` na pílula do celular.
 */
export function storeStatusText(t: PanelTenant): {
  full: string;
  short: string;
} {
  const s = t.openStatus;
  const word = s.isOpen ? "Aberto" : "Fechado";
  if (s.source === "MANUAL" || !s.changesAt) return { full: word, short: word };
  const tz = t.timeZone;
  if (s.source === "AJUSTE") {
    return {
      full: `${word} manualmente até ${shortWhen(s.changesAt, tz)}`,
      short: `${word} até ${shortWhen(s.changesAt, tz)}`,
    };
  }
  return s.isOpen
    ? {
        full: `Aberto · fecha ${shortWhen(s.changesAt, tz)}`,
        short: `Aberto · até ${shortWhen(s.changesAt, tz)}`,
      }
    : {
        full: `Fechado · abre ${shortWhen(s.changesAt, tz)}`,
        short: `Fechado · abre ${shortWhen(s.changesAt, tz)}`,
      };
}

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
 * Abrir/fechar a loja (topo do painel). A lógica é a de sempre:
 * - manual: alterna o estado;
 * - automático: "Fechar agora" vale até a próxima abertura; "Abrir agora"
 *   fora do horário pergunta até quando (máx. 12 h, o back valida);
 * - "Voltar ao automático" tira o ajuste temporário.
 * FECHAR sempre pede confirmação, inclusive quando voltar ao automático
 * fecha a loja (ajuste "aberto" fora do horário). Abrir não pede.
 */
export function useOpenFlow(tenant: PanelTenant) {
  const setOpen = useSetStoreOpen();
  const clear = useClearOpenOverride();
  const [choosing, setChoosing] = useState(false);
  const [confirm, setConfirm] = useState<null | "close" | "auto">(null);
  const auto = tenant.openingMode === "AUTOMATICO";
  const open = tenant.openStatus.isOpen;
  const busy = setOpen.isPending || clear.isPending;
  const scheduleOpen = tenant.openNowOptions?.scheduleOpen ?? false;
  const hasOverride = tenant.openStatus.source === "AJUSTE";
  const backToAutoCloses = hasOverride && open && !scheduleOpen;

  const toggle = () => {
    if (busy) return;
    if (open) return setConfirm("close");
    // manual, ou o horário já está aberto (só tira o "Fechar agora"): direto
    if (!auto || scheduleOpen) setOpen.mutate({ open: true });
    else setChoosing(true);
  };
  const backToAuto = () => {
    if (busy) return;
    if (backToAutoCloses) setConfirm("auto");
    else clear.mutate();
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

  const dialogs = (
    <>
      {auto && tenant.openNowOptions && (
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
      )}
      <ConfirmClose
        kind={confirm}
        pending={busy}
        onCancel={() => !busy && setConfirm(null)}
        onConfirm={() => {
          if (confirm === "close")
            setOpen.mutate(
              { open: false },
              { onSettled: () => setConfirm(null) },
            );
          else clear.mutate(undefined, { onSettled: () => setConfirm(null) });
        }}
      />
    </>
  );

  return {
    open,
    auto,
    busy,
    opening: setOpen.isPending,
    clearing: clear.isPending,
    hasOverride,
    mainLabel,
    closeHint,
    toggle,
    backToAuto,
    dialogs,
  };
}

function ConfirmClose({
  kind,
  pending,
  onCancel,
  onConfirm,
}: {
  kind: null | "close" | "auto";
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open={kind !== null}
      onOpenChange={(o) => !o && onCancel()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          role="alertdialog"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl"
        >
          <DialogPrimitive.Title className="text-lg font-bold text-zinc-900">
            Fechar a loja agora?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-zinc-600">
            Os clientes não conseguirão fazer pedidos.
            {kind === "auto" &&
              " Voltando ao automático, a loja segue os horários, e agora o horário é de loja fechada."}
          </DialogPrimitive.Description>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="h-12 rounded-xl border border-zinc-300 font-semibold text-zinc-700 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Fechar a loja
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
