import type { OrderStatus, PaymentMethod } from "@/types/api";
import type { PanelOrderEvent } from "@/types/panel";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDENTE: "Aguardando aceite",
  ACEITO: "Aceito",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
};

export const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDENTE: "bg-amber-100 text-amber-900",
  ACEITO: "bg-sky-100 text-sky-900",
  RECUSADO: "bg-red-100 text-red-800",
  CANCELADO: "bg-zinc-200 text-zinc-700",
  CONCLUIDO: "bg-emerald-100 text-emerald-900",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão (maquininha)",
};

/** Forma de pagamento do pedido; null = pedido de comanda (pago no fechamento). */
export const paymentText = (m: PaymentMethod | null) =>
  m === null ? "Na comanda" : PAYMENT_LABEL[m];

export const EVENT_LABEL: Record<PanelOrderEvent["type"], string> = {
  CRIADO: "Pedido recebido",
  ACEITO: "Aceito",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
  EDITADO: "Editado",
};

const pad = (n: number) => n.toString().padStart(2, "0");

/** "19:42" no fuso do aparelho. */
export const timeHM = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "19:42" se for hoje; "28/09 19:42" se não. */
export const dateTimeShort = (iso: string, now = new Date()) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? timeHM(iso)
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${timeHM(iso)}`;
};

/** "agora", "há 5 min", "há 2 h". */
export const ago = (iso: string, now = Date.now()) => {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h`;
};

/** Tempo desde o instante: "45 min", "1 h 20 min" (comanda aberta). */
export const elapsed = (iso: string, now = Date.now()) => {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
};

/** Data de hoje (AAAA-MM-DD) no fuso da loja. */
export const todayIn = (timeZone: string, now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);

/** Telefone salvo com DDI (5515999998888) → (15) 99999-8888. */
export const phoneText = (phone: string) => {
  const d = phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
};
