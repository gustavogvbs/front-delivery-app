import type { FieldErrors, Resolver } from "react-hook-form";

import type { CartLine } from "@/lib/cart";
import { onlyDigits } from "@/lib/format";
import type {
  CreateOrderBody,
  DeliveryType,
  LatLng,
  PaymentMethod,
} from "@/types/api";
import { z } from "zod";

export const checkoutSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome")
      .max(80, "Nome muito longo"),
    phone: z
      .string()
      .refine(
        (v) => [10, 11].includes(onlyDigits(v).length),
        "Informe o celular com DDD",
      ),
    deliveryType: z.enum(["ENTREGA", "RETIRADA"]),
    cep: z.string(),
    street: z.string().trim().max(120),
    number: z.string().trim().max(20),
    complement: z.string().trim().max(80),
    neighborhood: z.string().trim().max(80),
    city: z.string().trim().max(80),
    state: z.string().trim().max(2),
    reference: z.string().trim().max(120),
    noPin: z.boolean(),
    paymentMethod: z.enum(["DINHEIRO", "PIX", "CARTAO"]),
    needChange: z.boolean(),
    changeForCents: z.number().int().positive().nullable(),
    notes: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryType === "ENTREGA") {
      if (onlyDigits(v.cep).length !== 8)
        ctx.addIssue({
          code: "custom",
          path: ["cep"],
          message: "CEP com 8 dígitos",
        });
      if (!v.street)
        ctx.addIssue({
          code: "custom",
          path: ["street"],
          message: "Informe a rua",
        });
      if (!v.number)
        ctx.addIssue({
          code: "custom",
          path: ["number"],
          message: "Informe o número",
        });
      if (!v.neighborhood)
        ctx.addIssue({
          code: "custom",
          path: ["neighborhood"],
          message: "Informe o bairro",
        });
      if (!v.city)
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: "Informe a cidade",
        });
    }
    if (v.paymentMethod === "DINHEIRO" && v.needChange && !v.changeForCents) {
      ctx.addIssue({
        code: "custom",
        path: ["changeForCents"],
        message: "Informe o valor para o troco",
      });
    }
  });

export type CheckoutValues = z.infer<typeof checkoutSchema>;

/** Adaptador zod → react-hook-form (evita dependência extra). */
export const zodResolver =
  <T extends z.ZodTypeAny>(schema: T): Resolver<z.infer<T>> =>
  async (values) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path])
        errors[path] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: errors as FieldErrors<z.infer<T>> };
  };

export const emptyCheckout = (deliveryType: DeliveryType): CheckoutValues => ({
  name: "",
  phone: "",
  deliveryType,
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  reference: "",
  noPin: false,
  paymentMethod: "PIX" as PaymentMethod,
  needChange: false,
  changeForCents: null,
  notes: "",
});

/** Corpo do POST: só dados do cliente e IDs/quantidades — nenhum valor calculado. */
export function buildOrderBody(
  v: CheckoutValues,
  lines: CartLine[],
  pin: LatLng | null,
): CreateOrderBody {
  const opt = (s: string) => (s.trim() ? s.trim() : undefined);
  const body: CreateOrderBody = {
    customerName: v.name.trim(),
    customerPhone: onlyDigits(v.phone),
    deliveryType: v.deliveryType,
    paymentMethod: v.paymentMethod,
    notes: opt(v.notes),
    items: lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      notes: l.notes ?? undefined,
    })),
  };
  if (v.deliveryType === "ENTREGA") {
    body.address = {
      cep: onlyDigits(v.cep),
      street: v.street.trim(),
      number: v.number.trim(),
      complement: opt(v.complement),
      neighborhood: v.neighborhood.trim(),
      city: v.city.trim(),
      state: opt(v.state.toUpperCase()),
      reference: opt(v.reference),
    };
    if (pin && !v.noPin) body.location = pin;
  }
  if (v.paymentMethod === "DINHEIRO" && v.needChange && v.changeForCents) {
    body.changeForCents = v.changeForCents;
  }
  return body;
}
