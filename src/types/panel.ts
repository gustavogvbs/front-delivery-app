// Contratos do painel da loja (ver docs-projeto/api.md). Dinheiro em centavos.
import type { LatLng, OpenStatus, OrderStatus, PaymentMethod } from "./api";

export interface Session {
  user: { id: string; name: string; email: string; role: string };
  tenant: { id: string; slug: string; name: string; approved: boolean } | null;
}

/** GET /tenant/me: configurações completas da loja. */
export interface PanelTenant {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  whatsapp: string;
  primaryColor: string;
  approved: boolean;
  isOpen: boolean;
  deliveryTimeMinMinutes: number | null;
  deliveryTimeMaxMinutes: number | null;
  pixKey: string | null;
  minOrderCents: number | null;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  address: {
    cep: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string;
    state: string | null;
  };
  location: LatLng | null;
  logo: { url: string; alt: string } | null;
  initials: string;
  deliveryFeeTiers: DeliveryFeeTier[];
  openingMode: OpeningMode;
  timeZone: string;
  openingHours: OpeningInterval[];
  openStatus: OpenStatus;
  /** só no modo automático */
  openNowOptions: {
    /** aberto pelo horário (ignorando o ajuste): "Abrir agora" só tira o ajuste */
    scheduleOpen: boolean;
    /** "até o fechamento normal de hoje" (se houver e couber em 12 h) */
    todayClose: string | null;
    /** limite do "Abrir agora" (agora + 12 h) */
    maxUntil: string;
    /** até quando vale o "Fechar agora" (próxima abertura) */
    closeUntil: string | null;
  } | null;
}

export type OpeningMode = "MANUAL" | "AUTOMATICO";

export interface OpeningInterval {
  weekday: number; // 0 = domingo … 6 = sábado
  opensAt: number; // minutos desde 00:00
  closesAt: number; // 1–1440; <= opensAt = termina no dia seguinte
}

export interface DeliveryFeeTier {
  maxMeters: number;
  feeCents: number;
}

/** PATCH /tenant/me (parcial). */
export type SettingsPatch = Partial<{
  name: string;
  phone: string | null;
  whatsapp: string;
  primaryColor: string;
  isOpen: boolean;
  deliveryTimeMinMinutes: number | null;
  deliveryTimeMaxMinutes: number | null;
  pixKey: string | null;
  minOrderCents: number | null;
  acceptsPickup: boolean;
  addressCep: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  city: string;
  addressState: string | null;
  latitude: number | null;
  longitude: number | null;
}>;

export interface PanelProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  isAvailable: boolean;
  sortOrder: number;
  categoryId: string;
  image: { url: string; alt: string } | null;
}

export interface ProductInput {
  name: string;
  description: string | null;
  priceCents: number;
  categoryId: string;
  isAvailable: boolean;
  sortOrder: number;
}

/** Tipos de pedido no painel (o checkout público só usa ENTREGA/RETIRADA). */
export type OrderType = "ENTREGA" | "RETIRADA" | "BALCAO" | "CONSUMO_LOCAL";
export type OrderSource = "ONLINE" | "MANUAL";

export interface PanelOrderSummary {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  editedAt: string | null;
  customerName: string | null;
  source: OrderSource;
  deliveryType: OrderType;
  tableLabel: string | null;
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
  customer: { name: string | null; phone: string | null };
  source: OrderSource;
  deliveryType: OrderType;
  tableLabel: string | null;
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

/** GET /tenant/me/categories (cardápio do painel e itens na edição do pedido). */
export interface PanelCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  products: PanelProduct[];
}

/** Corpo do pedido registrado no painel (POST /tenant/me/orders e /preview). */
export interface ManualOrderBody {
  deliveryType: OrderType;
  tableLabel?: string;
  customerName?: string;
  customerPhone?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state?: string;
    reference?: string;
  };
  location?: LatLng;
  deliveryFeeCents?: number;
  paymentMethod: PaymentMethod;
  changeForCents?: number;
  notes?: string;
  items: { productId: string; quantity: number; notes?: string }[];
}

export interface ManualOrderPreview {
  items: {
    productId: string;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    totalCents: number;
  }[];
  subtotalCents: number;
  deliveryFeeCents: number | null;
  deliveryFeePending: boolean;
  distanceMeters: number | null;
  totalCents: number;
  storeOpen: boolean;
  openLabel: string;
}
