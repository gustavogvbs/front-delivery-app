import type { OrderType } from "@/types/panel";

/**
 * Formatação ÚNICA de tipo de pedido e de linha de item, usada no painel
 * (lista, detalhe), no "Novo pedido" e nas vias de impressão. A mensagem do
 * WhatsApp usa o equivalente no back (formatItemLine / orderTypeText).
 */
export function orderTypeLabel(o: {
  deliveryType: OrderType;
  tableLabel?: string | null;
}): string {
  switch (o.deliveryType) {
    case "ENTREGA":
      return "Entrega";
    case "RETIRADA":
      return "Retirada";
    case "BALCAO":
      return "Balcão";
    case "CONSUMO_LOCAL":
      return o.tableLabel ? o.tableLabel : "Comer no local";
  }
}

/** Texto longo do tipo (detalhe e impressão). */
export function orderTypeLongLabel(o: {
  deliveryType: OrderType;
  tableLabel?: string | null;
}): string {
  switch (o.deliveryType) {
    case "ENTREGA":
      return "Entrega";
    case "RETIRADA":
      return "Retirada no local";
    case "BALCAO":
      return "Balcão / para viagem";
    case "CONSUMO_LOCAL":
      return o.tableLabel
        ? `Comer no local · ${o.tableLabel}`
        : "Comer no local";
  }
}

export interface ItemLineData {
  quantity: number;
  productName: string;
  notes?: string | null;
  totalCents?: number;
}
