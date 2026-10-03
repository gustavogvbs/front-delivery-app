"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { splitFieldError } from "@/lib/api-errors";
import { formatBRL } from "@/lib/format";
import { dateTimeShort, elapsed, todayIn } from "@/lib/panel-format";
import { openTab } from "@/services/panel-api";
import type { TabSummary } from "@/types/panel";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  panelKeys,
  useOpenTabs,
  usePanelTenant,
  useTabHistory,
} from "./use-panel";

/** Comanda aberta há mais que isso ganha destaque (alguém pode ter esquecido). */
const LONG_OPEN_MS = 3 * 60 * 60 * 1000;

type View = "abertas" | "historico";

/** Aba "Mesas": comandas abertas (cartões) e histórico de fechadas/canceladas. */
export function TabsView() {
  const [view, setView] = useState<View>("abertas");
  const [opening, setOpening] = useState(false);
  const open = useOpenTabs();
  // relógio para o "aberta há…" (a lista em si atualiza a cada 20 s)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-4">
      <button
        type="button"
        onClick={() => setOpening(true)}
        className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white"
      >
        <Plus className="size-5" />
        Abrir comanda
      </button>
      <div
        role="tablist"
        className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-200/70 p-1"
      >
        {(
          [
            ["abertas", `Abertas (${open.data?.length ?? 0})`],
            ["historico", "Histórico"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`h-11 rounded-lg text-sm font-semibold ${
              view === key
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "abertas" ? (
        <OpenTabs
          tabs={open.data}
          loading={open.isLoading}
          error={open.isError}
          now={now}
        />
      ) : (
        <History />
      )}

      <OpenTabSheet open={opening} onOpenChange={setOpening} />
    </main>
  );
}

function OpenTabs({
  tabs,
  loading,
  error,
  now,
}: {
  tabs: TabSummary[] | undefined;
  loading: boolean;
  error: boolean;
  now: number;
}) {
  if (loading)
    return (
      <div className="flex justify-center py-10 text-zinc-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  if (error)
    return (
      <p className="mt-6 text-center text-sm text-zinc-600">
        Não foi possível carregar as comandas.
      </p>
    );
  if (!tabs || tabs.length === 0)
    return (
      <p className="mt-6 rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">
        Nenhuma comanda aberta. Abra uma aqui ou no “Novo pedido”, em “Comer no
        local”.
      </p>
    );
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="open-tabs">
      {tabs.map((t) => {
        const long = now - new Date(t.openedAt).getTime() > LONG_OPEN_MS;
        return (
          <li key={t.id}>
            <Link
              href={`/painel/mesas/${t.id}`}
              className={`block rounded-2xl border-2 bg-white p-4 shadow-sm active:bg-zinc-50 ${
                long ? "border-amber-400" : "border-transparent"
              }`}
              data-testid="tab-card"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate text-lg font-bold text-zinc-900">
                  {t.label}
                </span>
                <span className="shrink-0 text-lg font-bold tabular-nums text-zinc-900">
                  {formatBRL(t.consumedCents)}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600">
                <Clock className="size-4" />
                Aberta há {elapsed(t.openedAt, now)} · {t.ordersCount}{" "}
                {t.ordersCount === 1 ? "pedido" : "pedidos"}
              </p>
              {long && (
                <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                  Aberta há mais de 3 horas
                </p>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function History() {
  const tenant = usePanelTenant();
  const today = todayIn(tenant.data?.timeZone ?? "America/Sao_Paulo");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const valid = Boolean(from && to && from <= to);
  const history = useTabHistory(from, to, Boolean(tenant.data) && valid);
  const field =
    "mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base";

  return (
    <section className="mt-3 space-y-3" aria-label="Histórico de comandas">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">De</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Até</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className={field}
          />
        </label>
      </div>
      {!valid ? (
        <p className="text-sm text-red-700">
          A data inicial deve ser antes da final.
        </p>
      ) : history.isLoading ? (
        <div className="flex justify-center py-6 text-zinc-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (history.data ?? []).length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">
          Nenhuma comanda fechada ou cancelada no período.
        </p>
      ) : (
        <ul
          className="divide-y divide-zinc-100 rounded-2xl bg-white shadow-sm"
          data-testid="tab-history"
        >
          {history.data!.map((t) => (
            <li key={t.id}>
              <Link
                href={`/painel/mesas/${t.id}`}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-zinc-900">
                    {t.label}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {t.status === "FECHADA"
                      ? `Fechada ${dateTimeShort(t.closedAt!)}${t.closedBy ? ` por ${t.closedBy}` : ""}`
                      : `Cancelada ${dateTimeShort(t.canceledAt!)} · ${t.cancelReason ?? ""}`}
                  </span>
                </span>
                {t.closing ? (
                  <span className="shrink-0 font-semibold tabular-nums text-zinc-900">
                    {formatBRL(t.closing.totalCents)}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                    Cancelada
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Abrir comanda": só a identificação (Mesa 5, João, Varanda 2…). */
function OpenTabSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    if (!label.trim()) {
      setError("Informe a identificação (ex.: Mesa 5).");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const tab = await openTab(label.trim());
      void qc.invalidateQueries({ queryKey: panelKeys.tabs });
      qc.setQueryData(panelKeys.tab(tab.id), tab);
      toast.success(`Comanda ${tab.label} aberta.`);
      setLabel("");
      onOpenChange(false);
      router.push(`/painel/mesas/${tab.id}`);
    } catch (err) {
      setError(splitFieldError(err).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (saving) return;
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <SheetContent
        title="Abrir comanda"
        description="A identificação não pode repetir entre as comandas abertas."
      >
        <form onSubmit={submit} className="space-y-3 p-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">
              Identificação
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, 40))}
              placeholder="Ex.: Mesa 5, João, Varanda 2"
              autoFocus
              className="mt-1 h-12 w-full rounded-xl border border-zinc-300 px-3 text-base outline-none focus:border-zinc-900"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Abrir comanda
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
