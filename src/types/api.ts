// Contratos da API pública (ver docs-projeto/api.md). Dinheiro em centavos.

export interface ImageView {
  url: string;
  alt: string;
}

export interface MenuProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  isAvailable: boolean;
  image: ImageView | null;
}

export interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  products: MenuProduct[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Estado calculado no back (modo manual, ajuste temporário ou horários). */
export interface OpenStatus {
  isOpen: boolean;
  source: "MANUAL" | "HORARIO" | "AJUSTE";
  /** próxima mudança (ISO) ou null */
  changesAt: string | null;
  nextChange: {
    weekday: number;
    time: string;
    when: "HOJE" | "AMANHA" | "DIA_DA_SEMANA";
  } | null;
  /** "Aberto até 23:00", "Fechado · abre hoje às 18:00"… */
  label: string;
}

export interface Menu {
  id: string;
  slug: string;
  name: string;
  city: string;
  primaryColor: string;
  logo: ImageView | null;
  initials: string;
  isOpen: boolean;
  openStatus: OpenStatus;
  deliveryTime: { minMinutes: number; maxMinutes: number } | null;
  minOrderCents: number | null;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  location: LatLng | null;
  categories: MenuCategory[];
}

export interface DeliveryQuote {
  storeOpen: boolean;
  openLabel: string;
  acceptsDelivery: boolean;
  withinArea: boolean;
  distanceMeters: number | null;
  feeCents: number | null;
  maxMeters: number | null;
}

export type DeliveryType = "ENTREGA" | "RETIRADA";
export type PaymentMethod = "DINHEIRO" | "PIX" | "CARTAO";
export type OrderStatus =
  | "PENDENTE"
  | "ACEITO"
  | "RECUSADO"
  | "CANCELADO"
  | "CONCLUIDO";

export interface CreateOrderBody {
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
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
  paymentMethod: PaymentMethod;
  changeForCents?: number;
  notes?: string;
  items: { productId: string; quantity: number; notes?: string }[];
}

export interface OrderConfirmation {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  store: { name: string; slug: string; primaryColor: string };
  deliveryType: DeliveryType;
  items: {
    id: string;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    totalCents: number;
  }[];
  subtotalCents: number;
  deliveryFeeCents: number | null;
  distanceMeters: number | null;
  totalCents: number;
  paymentMethod: PaymentMethod;
  changeForCents: number | null;
  pixKey: string | null;
  whatsappUrl: string;
}
