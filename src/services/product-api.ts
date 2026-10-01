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

  async GET_CART(cardCookies: string | undefined, slug: string) {
    const cart: ICartItem[] = [];
    if (!cardCookies) return cart;

    let products: ProductResponseArr;
    let cartJson: CardCookieType;
    try {
      products = await req.get(`/products/${slug}?populate=category`);
      cartJson = JSON.parse(cardCookies);
    } catch (error) {
      // API indisponível ou cookie inválido: carrinho vazio em vez de quebrar a página
      console.error(error);
      return cart;
    }
    if (!Array.isArray(products?.data) || !Array.isArray(cartJson)) return cart;

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
