"use client";

import type React from "react";

import { Stepper } from "@/components/common/stepper";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  CartLine,
  productIndex,
  removeLine,
  setQuantity,
  subtotalOf,
  unavailableLines,
} from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import type { Menu } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: Menu;
  lines: CartLine[];
  onChange: (lines: CartLine[]) => void;
  onCheckout: () => void;
  /** aviso do que mudou (ex.: volta de um 409): exibido dentro da folha, visível */
  notice?: React.ReactNode;
}

export function CartSheet({
  open,
  onOpenChange,
  menu,
  lines,
  onChange,
  onCheckout,
  notice,
}: Props) {
  const products = productIndex(menu);
  const subtotal = subtotalOf(lines);
  const blocked = unavailableLines(lines, menu);
  const belowMin = menu.minOrderCents !== null && subtotal < menu.minOrderCents;

  let reason: string | null = null;
  if (!menu.isOpen)
    reason = `Loja fechada · ${menu.openStatus.label.replace(/^Fechado · /, "")}`;
  else if (blocked.length)
    reason = "Remova os itens indisponíveis para continuar.";
  else if (belowMin)
    reason = `O pedido mínimo é ${formatBRL(menu.minOrderCents!)} (sem a entrega).`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Seu carrinho" description={menu.name}>
        {notice}
        {lines.length === 0 ? (
          <p className="p-6 text-center text-zinc-500">
            Seu carrinho está vazio.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 px-4">
            {lines.map((line) => {
              const off = !products.get(line.productId)?.isAvailable;
              return (
                <li key={line.lineId} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`font-semibold ${off ? "text-zinc-400 line-through" : "text-zinc-900"}`}
                      >
                        {line.name}
                      </p>
                      {line.notes && (
                        <p className="text-sm text-zinc-500">
                          Obs.: {line.notes}
                        </p>
                      )}
                      {off ? (
                        <p className="text-sm font-semibold text-red-700">
                          Indisponível no momento
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          {formatBRL(line.unitPriceCents)} cada
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatBRL(line.unitPriceCents * line.quantity)}
                    </p>
                  </div>
                  <div className="mt-2 flex justify-end">
                    {off ? (
                      <button
                        className="h-11 rounded-xl px-4 text-sm font-semibold text-red-700"
                        onClick={() => onChange(removeLine(lines, line.lineId))}
                      >
                        Remover
                      </button>
                    ) : (
                      <Stepper
                        value={line.quantity}
                        onChange={(q) =>
                          onChange(setQuantity(lines, line.lineId, q))
                        }
                        allowRemove
                        label={`Quantidade de ${line.name}`}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {lines.length > 0 && (
          <div className="sticky bottom-0 space-y-3 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between text-base">
              <span className="text-zinc-600">Subtotal</span>
              <span className="font-bold tabular-nums">
                {formatBRL(subtotal)}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              A taxa de entrega é calculada no próximo passo.
            </p>
            {reason && (
              <p
                role="alert"
                className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
              >
                {reason}
              </p>
            )}
            <button
              type="button"
              disabled={reason !== null}
              onClick={onCheckout}
              className="h-14 w-full rounded-2xl bg-brand text-base font-semibold text-white disabled:bg-zinc-300"
            >
              Continuar
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
