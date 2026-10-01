import { publicApi } from "@/lib/http";
import type {
  CreateOrderBody,
  DeliveryQuote,
  LatLng,
  Menu,
  OrderConfirmation,
} from "@/types/api";

// O interceptor de publicApi devolve response.data; as rotas respondem { data }.
type Envelope<T> = { data: T };

export async function getMenu(slug: string): Promise<Menu> {
  const res = (await publicApi.get(
    `/tenants/${encodeURIComponent(slug)}`,
  )) as Envelope<Menu>;
  return res.data;
}

export async function getQuote(
  slug: string,
  pin: LatLng,
): Promise<DeliveryQuote> {
  const res = (await publicApi.post(
    `/tenants/${encodeURIComponent(slug)}/delivery-quote`,
    pin,
  )) as Envelope<DeliveryQuote>;
  return res.data;
}

export async function createOrder(
  slug: string,
  body: CreateOrderBody,
  idempotencyKey: string,
): Promise<OrderConfirmation> {
  const res = (await publicApi.post(
    `/tenants/${encodeURIComponent(slug)}/orders`,
    body,
    {
      headers: { "Idempotency-Key": idempotencyKey },
    },
  )) as Envelope<OrderConfirmation>;
  return res.data;
}

export async function getOrder(id: string): Promise<OrderConfirmation> {
  const res = (await publicApi.get(
    `/orders/${encodeURIComponent(id)}`,
  )) as Envelope<OrderConfirmation>;
  return res.data;
}

/** CEP → endereço. BrasilAPI v2 (às vezes traz coordenadas) com fallback no ViaCEP. */
export interface CepResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  location: LatLng | null;
}

async function fetchJson(url: string, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function lookupCep(cepDigits: string): Promise<CepResult | null> {
  const brasil = await fetchJson(
    `https://brasilapi.com.br/api/cep/v2/${cepDigits}`,
    5000,
  );
  if (brasil && brasil.city) {
    const coords = brasil.location?.coordinates;
    const lat = Number(coords?.latitude);
    const lng = Number(coords?.longitude);
    return {
      street: brasil.street ?? "",
      neighborhood: brasil.neighborhood ?? "",
      city: brasil.city ?? "",
      state: brasil.state ?? "",
      location:
        Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0
          ? { lat, lng }
          : null,
    };
  }
  const via = await fetchJson(
    `https://viacep.com.br/ws/${cepDigits}/json/`,
    5000,
  );
  if (via && !via.erro) {
    return {
      street: via.logradouro ?? "",
      neighborhood: via.bairro ?? "",
      city: via.localidade ?? "",
      state: via.uf ?? "",
      location: null,
    };
  }
  return null;
}
