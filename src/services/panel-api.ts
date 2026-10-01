import { panelApi } from "@/lib/http";
import type {
  DeliveryFeeTier,
  EditOrderBody,
  OrderAction,
  PanelCategory,
  PanelOrder,
  PanelOrderSummary,
  PanelProduct,
  PanelTenant,
  ProductInput,
  Session,
  SettingsPatch,
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

// ── configurações ──

export async function updateSettings(
  patch: SettingsPatch,
): Promise<PanelTenant> {
  const res = (await panelApi.patch(
    "/tenant/me",
    patch,
  )) as Envelope<PanelTenant>;
  return res.data;
}

export async function replaceTiers(
  tiers: DeliveryFeeTier[],
): Promise<PanelTenant> {
  const res = (await panelApi.put("/tenant/me/delivery-fee-tiers", {
    tiers,
  })) as Envelope<PanelTenant>;
  return res.data;
}

// O cliente usa JSON por padrão; com FormData o axios converteria para JSON.
// "multipart/form-data" faz o navegador montar o boundary.
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

const imageForm = (image: Blob, fields: Record<string, string> = {}) => {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  form.append("image", image, image instanceof File ? image.name : "foto.jpg");
  return form;
};

export async function uploadLogo(image: Blob): Promise<PanelTenant> {
  const res = (await panelApi.put(
    "/tenant/me/logo",
    imageForm(image),
    multipart,
  )) as Envelope<PanelTenant>;
  return res.data;
}

export async function removeLogo(): Promise<PanelTenant> {
  const res = (await panelApi.delete(
    "/tenant/me/logo",
  )) as Envelope<PanelTenant>;
  return res.data;
}

export async function changePassword(body: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<string> {
  const res = (await panelApi.put("/users/me/password", body)) as Envelope<{
    message: string;
  }>;
  return res.data.message;
}

// ── cardápio ──

export async function createCategory(body: {
  name: string;
  sortOrder?: number;
}): Promise<PanelCategory> {
  const res = (await panelApi.post(
    "/tenant/me/categories",
    body,
  )) as Envelope<PanelCategory>;
  return res.data;
}

export async function updateCategory(
  id: string,
  body: { name?: string; sortOrder?: number },
): Promise<PanelCategory> {
  const res = (await panelApi.patch(
    `/tenant/me/categories/${encodeURIComponent(id)}`,
    body,
  )) as Envelope<PanelCategory>;
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await panelApi.delete(`/tenant/me/categories/${encodeURIComponent(id)}`);
}

/** Cria o produto; com foto, vai em multipart (campos como texto). */
export async function createProduct(
  input: ProductInput,
  image?: Blob | null,
): Promise<PanelProduct> {
  const res = (
    image
      ? await panelApi.post(
          "/tenant/me/products",
          imageForm(image, {
            name: input.name,
            ...(input.description ? { description: input.description } : {}),
            priceCents: String(input.priceCents),
            categoryId: input.categoryId,
            isAvailable: String(input.isAvailable),
            sortOrder: String(input.sortOrder),
          }),
          multipart,
        )
      : await panelApi.post("/tenant/me/products", input)
  ) as Envelope<PanelProduct>;
  return res.data;
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
): Promise<PanelProduct> {
  const res = (await panelApi.patch(
    `/tenant/me/products/${encodeURIComponent(id)}`,
    patch,
  )) as Envelope<PanelProduct>;
  return res.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await panelApi.delete(`/tenant/me/products/${encodeURIComponent(id)}`);
}

export async function uploadProductImage(
  id: string,
  image: Blob,
): Promise<PanelProduct> {
  const res = (await panelApi.put(
    `/tenant/me/products/${encodeURIComponent(id)}/image`,
    imageForm(image),
    multipart,
  )) as Envelope<PanelProduct>;
  return res.data;
}

export async function removeProductImage(id: string): Promise<PanelProduct> {
  const res = (await panelApi.delete(
    `/tenant/me/products/${encodeURIComponent(id)}/image`,
  )) as Envelope<PanelProduct>;
  return res.data;
}
