"use client";

import { useState } from "react";

import { splitFieldError } from "@/lib/api-errors";
import {
  crossesMidnight,
  describeDay,
  MAX_INTERVALS_PER_DAY,
  minutesToTime,
  TIME_ZONES,
  timeToMinutes,
  WEEK_ORDER,
  WEEKDAY_LABELS,
} from "@/lib/opening";
import { putOpeningHours } from "@/services/panel-api";
import type { OpeningInterval, OpeningMode, PanelTenant } from "@/types/panel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { OpenControl } from "./open-control";
import { Card } from "./settings-view";
import { StoreSections } from "./store-sections";
import { panelKeys, usePanelTenant } from "./use-panel";

/** Loja → Horários: modo, fuso e intervalos por dia da semana. */
export function HoursView() {
  const tenant = usePanelTenant();
  if (!tenant.data) {
    return (
      <main className="flex justify-center py-10 text-zinc-400">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-4">
      <StoreSections />
      <OpenControl tenant={tenant.data} variant="card" />
      {/* key: o formulário recomeça do que está salvo depois de salvar */}
      <HoursForm
        key={JSON.stringify([
          tenant.data.openingMode,
          tenant.data.timeZone,
          tenant.data.openingHours,
        ])}
        tenant={tenant.data}
      />
    </main>
  );
}

interface Row {
  key: number;
  opens: string; // "HH:MM"
  closes: string;
}
type Week = Record<number, Row[]>;

let seq = 0;
const row = (opens = "", closes = ""): Row => ({ key: ++seq, opens, closes });

const weekFrom = (hours: OpeningInterval[]): Week => {
  const w: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  [...hours]
    .sort((a, b) => a.opensAt - b.opensAt)
    .forEach((h) =>
      w[h.weekday].push(
        row(minutesToTime(h.opensAt), minutesToTime(h.closesAt)),
      ),
    );
  return w;
};

function HoursForm({ tenant }: { tenant: PanelTenant }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<OpeningMode>(tenant.openingMode);
  const [timeZone, setTimeZone] = useState(tenant.timeZone);
  const [week, setWeek] = useState<Week>(() => weekFrom(tenant.openingHours));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: putOpeningHours,
    onSuccess: ({ tenant: data, overrideCleared }) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success("Horários salvos.");
      if (overrideCleared) {
        toast.info(
          "O ajuste temporário foi removido: a loja voltou a seguir os horários.",
        );
      }
    },
    onError: (err) => setError(splitFieldError(err).message),
  });

  const setDay = (day: number, rows: Row[]) =>
    setWeek((w) => ({ ...w, [day]: rows }));
  const updateRow = (day: number, key: number, patch: Partial<Row>) =>
    setDay(
      day,
      week[day].map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );

  const copyToAll = (from: number) =>
    setWeek(() => {
      const w: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      for (const d of WEEK_ORDER)
        w[d] = week[from].map((r) => row(r.opens, r.closes));
      return w;
    });

  const submit = () => {
    if (save.isPending) return;
    setError(null);
    const hours: OpeningInterval[] = [];
    for (const d of WEEK_ORDER) {
      for (const r of week[d]) {
        const opensAt = timeToMinutes(r.opens);
        const closesAt = timeToMinutes(r.closes, true);
        if (opensAt === null || closesAt === null) {
          setError(
            `${WEEKDAY_LABELS[d]}: preencha abertura e fechamento de cada intervalo.`,
          );
          return;
        }
        if (opensAt === closesAt) {
          setError(
            `${WEEKDAY_LABELS[d]}: abertura e fechamento não podem ser iguais.`,
          );
          return;
        }
        hours.push({ weekday: d, opensAt, closesAt });
      }
    }
    if (mode === "AUTOMATICO" && hours.length === 0) {
      setError("Para o modo automático, cadastre pelo menos um horário.");
      return;
    }
    save.mutate({ mode, timeZone, hours });
  };

  return (
    <Card
      title="Horário de funcionamento"
      description="No modo automático, a loja abre e fecha sozinha nesses horários."
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-zinc-700">
            Como a loja abre e fecha
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                [
                  "AUTOMATICO",
                  "Automático",
                  "Abre e fecha pelos horários abaixo.",
                ],
                ["MANUAL", "Manual", "Só pelo botão Abrir/Fechar, como antes."],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-xl border-2 p-3 text-left ${
                  mode === value
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200"
                }`}
              >
                <span className="block font-semibold text-zinc-900">
                  {label}
                </span>
                <span className="block text-sm text-zinc-600">{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            Fuso horário da loja
          </span>
          <select
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base"
          >
            {!TIME_ZONES.some((z) => z.value === timeZone) && (
              <option value={timeZone}>{timeZone}</option>
            )}
            {TIME_ZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </label>

        <ul className="space-y-3">
          {WEEK_ORDER.map((d) => {
            const rows = week[d];
            const closedDay = rows.length === 0;
            return (
              <li
                key={d}
                className="rounded-xl border border-zinc-200 p-3"
                data-testid={`day-${d}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-900">
                    {WEEKDAY_LABELS[d]}
                  </span>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={!closedDay}
                      onChange={(e) =>
                        setDay(
                          d,
                          e.target.checked ? [row("11:00", "23:00")] : [],
                        )
                      }
                      className="size-6 accent-zinc-900"
                      aria-label={`${WEEKDAY_LABELS[d]} aberto`}
                    />
                    Abre neste dia
                  </label>
                </div>
                {!closedDay && (
                  <div className="mt-2 space-y-2">
                    {rows.map((r, idx) => {
                      const o = timeToMinutes(r.opens);
                      const c = timeToMinutes(r.closes, true);
                      const nextDay =
                        o !== null &&
                        c !== null &&
                        c !== 1440 &&
                        crossesMidnight({ opensAt: o, closesAt: c });
                      return (
                        <div
                          key={r.key}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            type="time"
                            value={r.opens}
                            onChange={(e) =>
                              updateRow(d, r.key, { opens: e.target.value })
                            }
                            aria-label={`${WEEKDAY_LABELS[d]} intervalo ${idx + 1} abre`}
                            className="h-12 w-[7.5rem] rounded-xl border border-zinc-300 px-2 text-base"
                          />
                          <span className="text-zinc-500">às</span>
                          <input
                            type="time"
                            value={r.closes}
                            onChange={(e) =>
                              updateRow(d, r.key, { closes: e.target.value })
                            }
                            aria-label={`${WEEKDAY_LABELS[d]} intervalo ${idx + 1} fecha`}
                            className="h-12 w-[7.5rem] rounded-xl border border-zinc-300 px-2 text-base"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDay(
                                d,
                                rows.filter((x) => x.key !== r.key),
                              )
                            }
                            className="flex size-11 items-center justify-center rounded-full text-red-600"
                            aria-label={`Remover intervalo ${idx + 1} de ${WEEKDAY_LABELS[d]}`}
                          >
                            <Trash2 className="size-5" />
                          </button>
                          {nextDay && (
                            <span className="w-full text-xs text-amber-800">
                              Termina no dia seguinte (conta como{" "}
                              {WEEKDAY_LABELS[d].toLowerCase()}).
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={rows.length >= MAX_INTERVALS_PER_DAY}
                        onClick={() => setDay(d, [...rows, row()])}
                        className="flex h-11 items-center gap-1 rounded-xl border border-dashed border-zinc-400 px-3 text-sm font-semibold text-zinc-700 disabled:opacity-50"
                      >
                        <Plus className="size-4" /> Intervalo
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToAll(d)}
                        className="flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-medium text-zinc-600"
                      >
                        <Copy className="size-4" /> Copiar para todos os dias
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p
          className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700"
          data-testid="hours-summary"
        >
          {WEEK_ORDER.map((d) => {
            const intervals = week[d]
              .map((r) => ({
                weekday: d,
                opensAt: timeToMinutes(r.opens) ?? -1,
                closesAt: timeToMinutes(r.closes, true) ?? -1,
              }))
              .filter((i) => i.opensAt >= 0 && i.closesAt > 0);
            return (
              <span key={d} className="block">
                <strong>{WEEKDAY_LABELS[d]}:</strong> {describeDay(intervals)}
              </span>
            );
          })}
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={save.isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="size-5 animate-spin" />}
          Salvar horários
        </button>
      </div>
    </Card>
  );
}
