/**
 * Taxa de serviço em pontos-base (1000 = 10%). O VALOR da taxa é sempre
 * calculado no back (meio centavo para cima); aqui só formatação e leitura
 * do percentual digitado.
 */
export const MAX_SERVICE_FEE_BPS = 2000;

/** 1000 → "10%", 1250 → "12,5%", 725 → "7,25%". */
export function bpsText(bps: number): string {
  const whole = Math.floor(bps / 100);
  const frac = (bps % 100).toString().padStart(2, "0").replace(/0+$/, "");
  return `${whole}${frac ? `,${frac}` : ""}%`;
}

/** "10" / "12,5" / "7.25" → pontos-base; null se inválido ou fora de 0,01%–20%. */
export function percentToBps(text: string): number | null {
  const m = text
    .trim()
    .replace(".", ",")
    .match(/^(\d{1,2})(?:,(\d{1,2}))?$/);
  if (!m) return null;
  const bps = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
  return bps >= 1 && bps <= MAX_SERVICE_FEE_BPS ? bps : null;
}
