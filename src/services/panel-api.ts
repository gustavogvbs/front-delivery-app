import { panelApi } from "@/lib/http";
import type {
  EditOrderBody,
  OrderAction,
  PanelCategory,
  PanelOrder,
  PanelOrderSummary,
  PanelTenant,
  Session,
} from "@/types/panel";

// O interceptor devolve response.data; as rotas respondem { data }.
type Envelope<T> = { data: T };

export async function login(email: string, password: string) {
  const res = (await panelApi.post("/users/login", {
    email,
    password,
  })) as Envelope<Session>;
  return res.data;
}

export async function logout() {
  await panelApi.post("/users/logout");
}

export async function getPanelTenant(): Promise<PanelTenant> {
  const res = (await panelApi.get("/tenant/me")) as Envelope<PanelTenant>;
  return res.data;
}

/** Pedidos da loja (mais recentes primeiro). */
export async function listOrders(
  statuses: string[],
  limit = 100,
): Promise<PanelOrderSummary[]> {
  const res = (await panelApi.get("/tenant/me/orders", {
    params: { status: statuses.join(","), limit },
  })) as Envelope<PanelOrderSummary[]>;
  return res.data;
}

export async function getPanelOrder(id: string): Promise<PanelOrder> {
  const res = (await panelApi.get(
    `/tenant/me/orders/${encodeURIComponent(id)}`,
  )) as Envelope<PanelOrder>;
  return res.data;
}

export async function runOrderAction(
  id: string,
  action: OrderAction,
  reason?: string,
): Promise<PanelOrder> {
  const res = (await panelApi.post(
    `/tenant/me/orders/${encodeURIComponent(id)}/${action}`,
    reason ? { reason } : {},
  )) as Envelope<PanelOrder>;
  return res.data;
}

export async function editOrder(
  id: string,
  body: EditOrderBody,
): Promise<PanelOrder> {
  const res = (await panelApi.patch(
    `/tenant/me/orders/${encodeURIComponent(id)}`,
    body,
  )) as Envelope<PanelOrder>;
  return res.data;
}

export async function listPanelCategories(): Promise<PanelCategory[]> {
  const res = (await panelApi.get("/tenant/me/categories")) as Envelope<
    PanelCategory[]
  >;
  return res.data;
}
