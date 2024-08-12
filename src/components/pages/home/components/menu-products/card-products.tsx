"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Counter } from "@/components/shared/buttons/counter";
import {
  AccordionTrigger,
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useCartContext } from "@/contexts/cart";
import { ProductResponseAttr } from "@/contracts/product-response";
import { api } from "@/lib/api";
import { Formatter } from "@/lib/formatter";
import { CardCookieType, cardCookieSchema } from "@/schemas/cart-cookies";
import { toast } from "sonner";

import { hasCookie, getCookie, setCookie } from "cookies-next";

interface Props {
  product: ProductResponseAttr;
  category: string;
}

export const CardProducts = ({ product, category }: Props) => {
  const formatter = Formatter();
  const [counter, setCounter] = useState(1);
  const tenantSlug = useParams();

  const { setProduct } = useCartContext();

  const { image } = product.attributes;
  const { productApi } = api();

  const handleAddToCart = async () => {
    const cart: CardCookieType = [];

    // create or get existing cart
    if (hasCookie("cart")) {
      const cartCookie = getCookie("cart");
      const cartJson = cardCookieSchema.parse(JSON.parse(cartCookie as string));
      cartJson.forEach((item) => {
        if (item.qtd && item.id) cart.push(item);
      });
    }

    // search product in cart
    const cartIndex = cart.findIndex((item) => item.id === product.id);
    if (cartIndex > -1) {
      cart[cartIndex].qtd += counter;
    } else {
      cart.push({ id: product.id, qtd: counter });
    }

    // setting cookies
    setCookie("cart", JSON.stringify(cart));

    toast("Produto adicionado com sucesso.", {
      description:
        "Acesse o carrinho para finalizar a comprar ou continue comprando!",
    });

    try {
      const getProduct = await productApi.GET(
        product.attributes.slug,
        tenantSlug.tenant as string,
      );

      setProduct({ qtd: counter, product: getProduct.data });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-ful ring-1 ring-zinc-50 shadow-xl shadow-zinc-100 relative rounded-md  flex flex-row-reverse justify-between">
      <div className="flex flex-col w-full">
        <AccordionItem
          value={`product-menu-${product.id}`}
          className="rounded-md overflow-hidden shadow-md shadow-zinc-100"
        >
          <AccordionTrigger className="p-0 text-start rounded-md overflow-hidden shadow-md shadow-zinc-100 z-10 ">
            <div className="relative flex flex-row-reverse w-full justify-between p-4  bg-white ">
              <div className="absolute top-0 right-0 h-full w-28 bg-primary opacity-10 z-10 rounded-e-md " />
              <div className="pr-4 relative z-20">
                <Image
                  style={{
                    width: "auto",
                    height: "auto",
                    maxHeight: "96px",
                    maxWidth: "96px",
                  }}
                  src={image.url}
                  height={120}
                  width={120}
                  alt={`${image.alt} - Imagem do menu`}
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs text-zinc-400">{category}</p>
                <h5 className="text-xl font-bold text-zinc-900">
                  {product.attributes.name}
                </h5>
                <h6 className="text-lg text-primary font-bold">
                  {formatter.formatPrice(product.attributes.price)}
                </h6>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="">
            <div className="p-4 relative bottom-0 bg-white ">
              <p className="text-sm text-zinc-500">
                {product.attributes.description}
              </p>
              <div className="flex justify-between pt-4 pb-1">
                <Counter
                  value={counter}
                  handleMinus={() => setCounter(counter - 1)}
                  handlePlus={() => setCounter(counter + 1)}
                />
                <Button size="sm" className="text-sm" onClick={handleAddToCart}>
                  Adicionar
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </div>
    </div>
  );
};
