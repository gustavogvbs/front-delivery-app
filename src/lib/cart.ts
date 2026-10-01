import type { Menu, MenuProduct } from "@/types/api";

import { readJSON, remove, writeJSON } from "./storage";

/** Item do carrinho. Nome e preço são só para exibição: o back recalcula tudo. */
export interface CartLine {
  lineId: string;
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string | null;
}

export type CartChange =
  | { type: "removed"; name: string }
  | { type: "unavailable"; name: string }
  | { type: "price"; name: string; fromCents: number; toCents: number };

const key = (slug: string) => `cart:${slug}`;
const MAX_QTY = 50;

/** Carrinho persistido POR LOJA no localStorage (falhas de storage são ignoradas). */
export function loadCart(slug: string): CartLine[] {
  const data = readJSON<CartLine[]>("local", key(slug));
  if (!Array.isArray(data)) return [];
  return data.filter(
    (l) =>
      l &&
      typeof l.productId === "string" &&
      Number.isInteger(l.quantity) &&
      l.quantity > 0 &&
      typeof l.unitPriceCents === "number",
  );
}

export const saveCart = (slug: string, lines: CartLine[]) =>
  lines.length
    ? writeJSON("local", key(slug), lines)
    : remove("local", key(slug));

export const clearCart = (slug: string) => remove("local", key(slug));

const newLineId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Adiciona (juntando com a mesma combinação produto + observação). */
export function addLine(
  lines: CartLine[],
  product: MenuProduct,
  quantity: number,
  notes: string | null,
): CartLine[] {
  const n = notes?.trim() || null;
  const existing = lines.find(
    (l) => l.productId === product.id && l.notes === n,
  );
  if (existing) {
    return lines.map((l) =>
      l === existing
        ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) }
        : l,
    );
  }
  return [
    ...lines,
    {
      lineId: newLineId(),
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity: Math.min(MAX_QTY, quantity),
      notes: n,
    },
  ];
}

export const setQuantity = (
  lines: CartLine[],
  lineId: string,
  quantity: number,
) =>
  quantity <= 0
    ? lines.filter((l) => l.lineId !== lineId)
    : lines.map((l) =>
        l.lineId === lineId
          ? { ...l, quantity: Math.min(MAX_QTY, quantity) }
          : l,
      );

export const removeLine = (lines: CartLine[], lineId: string) =>
  lines.filter((l) => l.lineId !== lineId);

export function productIndex(menu: Menu): Map<string, MenuProduct> {
  return new Map(
    menu.categories.flatMap((c) => c.products).map((p) => [p.id, p]),
  );
}

/**
 * Reconcilia o carrinho salvo com o cardápio atual:
 * - produto que não existe mais → removido;
 * - produto indisponível → mantido, mas marcado (não pode ir para o checkout);
 * - preço diferente → atualizado.
 * Devolve as mudanças para avisar o cliente.
 */
export function reconcileCart(
  lines: CartLine[],
  menu: Menu,
): { lines: CartLine[]; changes: CartChange[] } {
  const products = productIndex(menu);
  const changes: CartChange[] = [];
  const next: CartLine[] = [];
  for (const line of lines) {
    const p = products.get(line.productId);
    if (!p) {
      changes.push({ type: "removed", name: line.name });
      continue;
    }
    if (!p.isAvailable) changes.push({ type: "unavailable", name: p.name });
    if (p.priceCents !== line.unitPriceCents) {
      changes.push({
        type: "price",
        name: p.name,
        fromCents: line.unitPriceCents,
        toCents: p.priceCents,
      });
    }
    next.push({ ...line, name: p.name, unitPriceCents: p.priceCents });
  }
  return { lines: next, changes };
}

export const unavailableLines = (lines: CartLine[], menu: Menu) => {
  const products = productIndex(menu);
  return lines.filter((l) => !products.get(l.productId)?.isAvailable);
};

export const subtotalOf = (lines: CartLine[]) =>
  lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);

export const countOf = (lines: CartLine[]) =>
  lines.reduce((s, l) => s + l.quantity, 0);

/** Mudanças detectadas num erro 409 do pedido, para mostrar ao voltar ao cardápio. */
const changesKey = (slug: string) => `cartChanges:${slug}`;
export const stashChanges = (
  slug: string,
  payload: { message: string; changes: CartChange[] },
) => writeJSON("session", changesKey(slug), payload);
export function takeStashedChanges(slug: string) {
  const v = readJSON<{ message: string; changes: CartChange[] }>(
    "session",
    changesKey(slug),
  );
  remove("session", changesKey(slug));
  return v;
}

export function describeChange(c: CartChange): string {
  if (c.type === "removed")
    return `${c.name} saiu do cardápio e foi removido do carrinho.`;
  if (c.type === "unavailable")
    return `${c.name} está indisponível no momento.`;
  const up = c.toCents > c.fromCents;
  return `${c.name} ${up ? "subiu" : "baixou"} de preço.`;
}
