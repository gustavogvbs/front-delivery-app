"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Stepper } from "@/components/common/stepper";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatBRL } from "@/lib/format";
import type { MenuProduct } from "@/types/api";

interface Props {
  product: MenuProduct | null;
  canOrder: boolean;
  onClose: () => void;
  onAdd: (product: MenuProduct, quantity: number, notes: string | null) => void;
}

export function ProductSheet({ product, canOrder, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setQty(1);
    setNotes("");
  }, [product?.id]);

  return (
    <Sheet open={product !== null} onOpenChange={(o) => !o && onClose()}>
      {product && (
        <SheetContent
          title={product.name}
          description={formatBRL(product.priceCents)}
        >
          {product.image && (
            <Image
              src={product.image.url}
              alt={product.image.alt || product.name}
              width={600}
              height={400}
              className="h-52 w-full object-cover"
            />
          )}
          <div className="space-y-4 p-4">
            {product.description && (
              <p className="text-zinc-600">{product.description}</p>
            )}
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Alguma observação?
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="Ex.: sem cebola, ponto da carne…"
                className="mt-1 w-full resize-none rounded-xl border border-zinc-300 p-3 text-base focus:border-brand focus:outline-none"
              />
              <span className="text-xs text-zinc-400">{notes.length}/200</span>
            </label>
          </div>
          <div className="sticky bottom-0 flex items-center gap-3 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Stepper value={qty} onChange={setQty} label="Quantidade" />
            <button
              type="button"
              disabled={!canOrder}
              onClick={() => onAdd(product, qty, notes)}
              className="h-12 flex-1 rounded-xl bg-brand font-semibold text-white disabled:bg-zinc-300"
            >
              {canOrder
                ? `Adicionar • ${formatBRL(product.priceCents * qty)}`
                : "Loja fechada"}
            </button>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
