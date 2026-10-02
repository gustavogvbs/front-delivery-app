import { OrderItemLine } from "@/components/orders/order-item-line";
import { formatBRL, maskCep } from "@/lib/format";
import { orderTypeLongLabel } from "@/lib/order-lines";
import { dateTimeShort, PAYMENT_LABEL, phoneText } from "@/lib/panel-format";
import type { PrintCopy } from "@/lib/print";
import type { PanelOrder } from "@/types/panel";

/**
 * Cupom para impressora térmica (58/80 mm): preto puro, sem imagens, fonte
 * grande. CSS próprio (não Tailwind) para controlar a impressão.
 */
export function ticketCss(width: 58 | 80) {
  const base = width === 80 ? 15 : 12.5;
  return `
  @page { size: ${width}mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .ticket { width: ${width}mm; box-sizing: border-box; padding: 2mm 3mm 4mm;
    font-family: "Courier New", Courier, monospace; color: #000;
    font-size: ${base}px; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ticket * { color: #000 !important; background: transparent; }
  .t-store { text-align: center; font-size: ${base * 0.9}px; font-weight: 700; }
  .t-copy { text-align: center; font-size: ${base * 0.85}px; letter-spacing: 1px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin: 1.5mm 0; padding: 0.5mm 0; }
  .t-number { text-align: center; font-size: ${base * 3.4}px; font-weight: 900; line-height: 1; margin: 2mm 0 1mm; }
  .t-type { text-align: center; font-size: ${base * 1.5}px; font-weight: 900; text-transform: uppercase; border: 2px solid #000; padding: 1mm; margin: 1mm 0; }
  .t-time { text-align: center; font-size: ${base * 0.95}px; }
  .t-section { border-top: 1px dashed #000; margin-top: 2mm; padding-top: 1.5mm; }
  .t-label { font-weight: 700; text-transform: uppercase; font-size: ${base * 0.85}px; }
  .print-item-wrap { margin: 1.2mm 0; }
  .print-item { display: flex; justify-content: space-between; gap: 2mm; font-size: ${base * 1.15}px; font-weight: 700; }
  .print-item > span:first-child { min-width: 0; overflow-wrap: anywhere; }
  .print-note { display: block; margin-top: 0.6mm; padding: 0.6mm 1mm; border: 2px solid #000; font-size: ${base * 1.05}px; font-weight: 900; }
  .print-price { white-space: nowrap; font-weight: 400; font-size: ${base}px; }
  .t-notes { border: 2px solid #000; padding: 1mm; font-weight: 900; text-transform: uppercase; font-size: ${base * 1.05}px; overflow-wrap: anywhere; }
  .t-row { display: flex; justify-content: space-between; gap: 2mm; }
  .t-total { font-size: ${base * 1.35}px; font-weight: 900; }
  .t-cut { text-align: center; margin: 4mm 0; font-size: ${base * 0.85}px; letter-spacing: 2px; }
  .t-wrap { overflow-wrap: anywhere; }
  @media screen { .ticket { margin: 0 auto 8mm; outline: 1px solid #ddd; } }
  @media print { .no-print { display: none !important; } }
  `;
}

/** Cabeçalho + itens (+ obs.). A cozinha não vê preços; a via de entrega vê. */
function KitchenBody({
  order,
  prices = false,
}: {
  order: PanelOrder;
  prices?: boolean;
}) {
  return (
    <>
      <div className="t-number">#{order.number}</div>
      <div className="t-type">{orderTypeLongLabel(order)}</div>
      <div className="t-time">
        {dateTimeShort(order.createdAt)}
        {order.editedAt ? ` · editado ${dateTimeShort(order.editedAt)}` : ""}
      </div>
      <div className="t-section">
        {order.items.map((i) => (
          <OrderItemLine
            key={i.id}
            item={i}
            showPrice={prices}
            variant="print"
          />
        ))}
      </div>
      {order.notes && (
        <div className="t-section">
          <div className="t-label">Observação do pedido</div>
          <div className="t-notes">{order.notes}</div>
        </div>
      )}
    </>
  );
}

function DeliveryExtra({ order }: { order: PanelOrder }) {
  const a = order.address;
  const change =
    order.paymentMethod === "DINHEIRO" && order.changeForCents
      ? order.changeForCents - order.totalCents
      : null;
  return (
    <>
      {(order.customer.name || order.customer.phone) && (
        <div className="t-section t-wrap">
          <div className="t-label">Cliente</div>
          {order.customer.name && <div>{order.customer.name}</div>}
          {order.customer.phone && <div>{phoneText(order.customer.phone)}</div>}
        </div>
      )}
      {a && (
        <div className="t-section t-wrap">
          <div className="t-label">Endereço</div>
          <div>
            {a.street}, {a.number}
            {a.complement ? ` - ${a.complement}` : ""}
          </div>
          <div>
            {a.neighborhood} - {a.city}
            {a.state ? `/${a.state}` : ""}
          </div>
          {a.cep && <div>CEP {maskCep(a.cep)}</div>}
          {a.reference && <div>Ref.: {a.reference}</div>}
        </div>
      )}
      <div className="t-section">
        <div className="t-row">
          <span>Subtotal</span>
          <span>{formatBRL(order.subtotalCents)}</span>
        </div>
        {order.deliveryType === "ENTREGA" && (
          <div className="t-row">
            <span>Entrega</span>
            <span>
              {order.deliveryFeeCents === null
                ? "a combinar"
                : formatBRL(order.deliveryFeeCents)}
            </span>
          </div>
        )}
        <div className="t-row t-total">
          <span>TOTAL</span>
          <span>
            {formatBRL(order.totalCents)}
            {order.deliveryFeePending ? " +ent." : ""}
          </span>
        </div>
      </div>
      <div className="t-section">
        <div className="t-label">Pagamento</div>
        <div>{PAYMENT_LABEL[order.paymentMethod]}</div>
        {order.changeForCents ? (
          <div>
            Troco para {formatBRL(order.changeForCents)}
            {change !== null && change >= 0 && !order.deliveryFeePending
              ? ` (levar ${formatBRL(change)})`
              : ""}
          </div>
        ) : order.paymentMethod === "DINHEIRO" ? (
          <div>Sem troco</div>
        ) : null}
      </div>
    </>
  );
}

/** Uma ou duas vias. "ambas" = cozinha + entrega na mesma tira, com linha de corte. */
export function OrderTicket({
  order,
  storeName,
  copy,
}: {
  order: PanelOrder;
  storeName: string;
  copy: PrintCopy;
}) {
  const kitchen = copy === "cozinha" || copy === "ambas";
  const delivery = copy === "entrega" || copy === "ambas";
  return (
    <div className="ticket" data-testid="ticket">
      {kitchen && (
        <section data-testid="ticket-kitchen">
          <div className="t-store">{storeName}</div>
          <div className="t-copy">VIA DA COZINHA</div>
          <KitchenBody order={order} />
        </section>
      )}
      {kitchen && delivery && (
        <div className="t-cut">- - - - corte aqui - - - -</div>
      )}
      {delivery && (
        <section data-testid="ticket-delivery">
          <div className="t-store">{storeName}</div>
          <div className="t-copy">
            {order.deliveryType === "ENTREGA"
              ? "VIA DE ENTREGA"
              : "VIA DO CLIENTE"}
          </div>
          <KitchenBody order={order} prices />
          <DeliveryExtra order={order} />
        </section>
      )}
    </div>
  );
}
