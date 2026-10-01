/** Dinheiro em centavos → "R$ 1.234,56" (sem Intl: estável entre navegadores). */
export function formatBRL(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}R$ ${reais},${(abs % 100).toString().padStart(2, "0")}`;
}

export const formatKm = (meters: number) =>
  `${(meters / 1000).toFixed(1).replace(".", ",")} km`;

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

/** Máscara de telefone BR: (15) 99999-9999 ou (15) 3333-4444 */
export function maskPhone(value: string): string {
  const d = onlyDigits(value)
    .replace(/^55(?=\d{10,11}$)/, "")
    .slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Máscara de CEP: 18030-000 */
export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Digitação de valor em reais (centavos à direita): "10000" → "R$ 100,00" */
export function maskMoney(value: string): {
  text: string;
  cents: number | null;
} {
  const d = onlyDigits(value).replace(/^0+/, "").slice(0, 9);
  if (!d) return { text: "", cents: null };
  const cents = Number(d);
  return { text: formatBRL(cents), cents };
}

export const deliveryTimeText = (
  t: { minMinutes: number; maxMinutes: number } | null,
) => (t ? `${t.minMinutes}–${t.maxMinutes} min` : null);
