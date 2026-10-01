import { formatBRL } from "@/lib/format";
import { itemLineText, type ItemLineData } from "@/lib/order-lines";

/**
 * Linha de item única (detalhe do pedido, "Novo pedido" e impressão):
 * quantidade em destaque, nome, observação destacada e, se pedido, o preço.
 */
export function OrderItemLine({
  item,
  showPrice = true,
  variant = "screen",
}: {
  item: ItemLineData;
  showPrice?: boolean;
  variant?: "screen" | "print";
}) {
  const print = variant === "print";
  return (
    <div className={print ? "print-item" : "flex justify-between gap-3"}>
      <span className={print ? "" : "min-w-0 text-zinc-800"}>
        <strong>
          {itemLineText(item).replace(` ${item.productName}`, "")}
        </strong>{" "}
        {item.productName}
        {item.notes && (
          <span
            className={
              print ? "print-note" : "block text-sm font-medium text-amber-800"
            }
          >
            {print ? `OBS: ${item.notes.toUpperCase()}` : `Obs.: ${item.notes}`}
          </span>
        )}
      </span>
      {showPrice && item.totalCents !== undefined && (
        <span className={print ? "print-price" : "shrink-0 tabular-nums"}>
          {formatBRL(item.totalCents)}
        </span>
      )}
    </div>
  );
}
