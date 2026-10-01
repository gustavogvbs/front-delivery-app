import type { OrderConfirmation } from "@/types/api";

import { readJSON, readText, remove, writeJSON, writeText } from "./storage";

/**
 * Idempotency-Key do checkout, POR LOJA, no sessionStorage: criada ao entrar
 * no checkout, reaproveitada em reenvios e recarregamentos, descartada só
 * depois que o pedido é confirmado pelo back.
 */
const idemKey = (slug: string) => `idem:${slug}`;

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : // fallback RFC 4122 v4 (navegadores muito antigos)
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

export function getOrCreateIdempotencyKey(slug: string): string {
  const existing = readText("session", idemKey(slug));
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  const key = uuid();
  writeText("session", idemKey(slug), key);
  return key;
}

export const discardIdempotencyKey = (slug: string) =>
  remove("session", idemKey(slug));

/** Confirmação devolvida pelo POST, para a tela abrir instantaneamente. */
export const cacheOrder = (order: OrderConfirmation) =>
  writeJSON("session", `order:${order.id}`, order);
export const cachedOrder = (id: string) =>
  readJSON<OrderConfirmation>("session", `order:${id}`);

/** Evita reabrir o WhatsApp automaticamente ao recarregar a confirmação. */
export const markWhatsappOpened = (id: string) =>
  writeText("session", `sent:${id}`, "1");
export const whatsappAlreadyOpened = (id: string) =>
  readText("session", `sent:${id}`) === "1";

/** Dados do cliente lembrados neste aparelho (nada vai para o back). */
export interface RememberedCustomer {
  name: string;
  phone: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    reference: string;
  };
}
export const loadCustomer = () =>
  readJSON<RememberedCustomer>("local", "customer");
export const saveCustomer = (c: RememberedCustomer) =>
  writeJSON("local", "customer", c);
