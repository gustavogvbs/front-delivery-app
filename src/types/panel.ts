// Contratos do painel da loja (ver docs-projeto/api.md). Dinheiro em centavos.
import type { DeliveryType, LatLng, OrderStatus, PaymentMethod } from "./api";

export interface Session {
  user: { id: string; name: string; email: string; role: string };
  tenant: { id: string; slug: string; name: string; approved: boolean } | null;
}

/** GET /tenant/me (só o que o painel de pedidos usa). */
export interface PanelTenant {
  id: string;
  slug: string;
  name: string;
  primaryColor: string;
  isOpen: boolean;
}

export interface PanelOrderSummary {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  editedAt: string | null;
  customerName: string;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  totalCents: number;
  deliveryFeePending: boolean;
  itemsCount: number;
}

export interface PanelOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  notes: string | null;
  totalCents: number;
}

export interface PanelOrderEvent {
  id: string;
  type:
    | "CRIADO"
    | "ACEITO"
    | "RECUSADO"
    | "CANCELADO"
    | "CONCLUIDO"
    | "EDITADO";
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  reason: string | null;
  actorUserId: string | null;
  createdAt: string;
}

export interface PanelOrder {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  customer: { name: string; phone: string };
  deliveryType: DeliveryType;
  address: {
    cep: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    reference: string | null;
  } | null;
  location: LatLng | null;
  distanceMeters: number | null;
  deliveryFeeCents: number | null;
  deliveryFeePending: boolean;
  paymentMethod: PaymentMethod;
  changeForCents: number | null;
  notes: string | null;
  items: PanelOrderItem[];
  subtotalCents: number;
  totalCents: number;
  rejectionReason: string | null;
  cancellationReason: string | null;
  events: PanelOrderEvent[];
  notifyCustomerUrl: string | null;
}

export type OrderAction = "accept" | "reject" | "complete" | "cancel";

export interface EditOrderBody {
  items?: (
    | { itemId: string; quantity: number; notes?: string | null }
    | { productId: string; quantity: number; notes?: string | null }
  )[];
  notes?: string | null;
  deliveryFeeCents?: number;
  paymentMethod?: PaymentMethod;
  changeForCents?: number | null;
}

/** GET /tenant/me/categories (para adicionar itens na edição). */
export interface PanelCategory {
  id: string;
  name: string;
  products: {
    id: string;
    name: string;
    priceCents: number;
    isAvailable: boolean;
  }[];
}
