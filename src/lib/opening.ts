import type { OpeningInterval } from "@/types/panel";

/**
 * Apoio da tela de horários. O estado "aberto/fechado" e os textos do
 * cardápio vêm SEMPRE do back; aqui só há conversões de exibição.
 */
export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
/** Semana começando na segunda, como a lanchonete pensa. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const MAX_INTERVALS_PER_DAY = 4;

/** Fusos do Brasil primeiro (rótulo amigável). */
export const TIME_ZONES: { value: string; label: string }[] = [
  {
    value: "America/Sao_Paulo",
    label: "Brasília (SP, RJ, MG, Sul, GO, DF, BA, NE)",
  },
  { value: "America/Manaus", label: "Amazonas (Manaus)" },
  { value: "America/Cuiaba", label: "Mato Grosso (Cuiabá)" },
  { value: "America/Campo_Grande", label: "Mato Grosso do Sul (Campo Grande)" },
  { value: "America/Porto_Velho", label: "Rondônia (Porto Velho)" },
  { value: "America/Boa_Vista", label: "Roraima (Boa Vista)" },
  { value: "America/Rio_Branco", label: "Acre (Rio Branco)" },
  { value: "America/Belem", label: "Pará / Amapá (Belém)" },
  { value: "America/Noronha", label: "Fernando de Noronha" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** 1080 → "18:00"; 1440 → "00:00" (meia-noite do fim do dia). */
export const minutesToTime = (m: number) =>
  `${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}`;

/** "18:00" → 1080. No fechamento, "00:00" vira 1440 (fim do dia). */
export function timeToMinutes(value: string, isClosing = false): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  if (minutes >= 1440) return null;
  return isClosing && minutes === 0 ? 1440 : minutes;
}

export const crossesMidnight = (
  i: Pick<OpeningInterval, "opensAt" | "closesAt">,
) => i.closesAt <= i.opensAt;

/** "11:00–14:00 e 18:00–02:00 (dia seguinte)" */
export function describeDay(intervals: OpeningInterval[]): string {
  if (intervals.length === 0) return "fechado";
  const parts = [...intervals]
    .sort((a, b) => a.opensAt - b.opensAt)
    .map(
      (i) =>
        `${minutesToTime(i.opensAt)}–${minutesToTime(i.closesAt)}${
          crossesMidnight(i) && i.closesAt !== 1440 ? " (dia seguinte)" : ""
        }`,
    );
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`
    : parts[0];
}

/** "hoje 15:00", "amanhã 02:00", "sex 18:00" — no fuso da loja. */
export function whenText(
  iso: string,
  timeZone: string,
  now = new Date(),
): string {
  const at = new Date(iso);
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  if (day(at) === day(now)) return `hoje ${time}`;
  if (day(at) === day(new Date(now.getTime() + 86_400_000)))
    return `amanhã ${time}`;
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "short",
  })
    .format(at)
    .replace(".", "");
  return `${weekday} ${time}`;
}
