import { type CookieValueTypes } from "cookies-next";

import req from "@config/request-handle";

import {
  ProductResponseArr,
  ProductResponseData,
} from "@contracts/product-response";

import { CardCookieType, ICartItem } from "@schemas/cart-cookies";

export const product = {
  async GET_ALL(slug: string): Promise<ProductResponseArr> {
    return await req.get(`/products/${slug}?populate=categories`);
  },
  async GET(slug: string, tenant: string): Promise<ProductResponseData> {
    return await req.get(`/product/${tenant}/${slug}?populate=category`);
  },

  async GET_CART(cardCookies: CookieValueTypes, slug: string) {
    const cart: ICartItem[] = [];
    if (!cardCookies) return cart;

    let products: ProductResponseArr;
    try {
      products = await req
        .get(`/products/${slug}?populate=category`)
        .catch((data) => data);
      console.log(products);
    } catch (error) {
      console.log(error);
    }

    const cartJson: CardCookieType = JSON.parse(cardCookies);

    cartJson.forEach((item) => {
      products.data.forEach((product) => {
        if (item.id === product.id && item.qtd) {
          cart.push({ qtd: item.qtd, product: product });
        }
      });
    });

    return cart;
  },
};
