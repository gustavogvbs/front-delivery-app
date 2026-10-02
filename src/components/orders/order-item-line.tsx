import { formatBRL } from "@/lib/format";
import { type ItemLineData } from "@/lib/order-lines";

/**
 * Linha de item única (detalhe do pedido, "Novo pedido" e impressão):
 * quantidade em destaque, nome, observação destacada e, se pedido, o preço.
 * Na impressão, a observação ocupa a largura toda da bobina, abaixo do item.
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
  const price =
    showPrice && item.totalCents !== undefined
      ? formatBRL(item.totalCents)
      : null;

  if (variant === "print") {
    return (
      <div className="print-item-wrap">
        <div className="print-item">
          <span>
            <strong>{item.quantity}x</strong> {item.productName}
          </span>
          {price && <span className="print-price">{price}</span>}
        </div>
        {item.notes && (
          <span className="print-note">OBS: {item.notes.toUpperCase()}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-between gap-3">
      <span className="min-w-0 text-zinc-800">
        <strong>{item.quantity}x</strong> {item.productName}
        {item.notes && (
          <span className="block text-sm font-medium text-amber-800">
            Obs.: {item.notes}
          </span>
        )}
      </span>
      {price && <span className="shrink-0 tabular-nums">{price}</span>}
    </div>
  );
}
