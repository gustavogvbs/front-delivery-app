import { z } from "zod";

import { ProductResponseAttr } from "@contracts/product-response";

const cardCookieSchema = z.array(
  z.object({
    id: z.string(),
    qtd: z.number(),
  }),
);

type CardCookieType = z.infer<typeof cardCookieSchema>;

interface ICartItem {
  qtd: number;
  product: ProductResponseAttr;
}

export { type CardCookieType, type ICartItem, cardCookieSchema };
