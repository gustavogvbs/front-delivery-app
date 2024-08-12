import Image from "next/image";
import { useState } from "react";

import { Counter } from "@/components/shared/buttons/counter";
import { ProductResponseAttr } from "@/contracts/product-response";
import { Formatter } from "@/lib/formatter";
import { CardCookieType, cardCookieSchema } from "@/schemas/cart-cookies";

import { getCookie, setCookie } from "cookies-next";

interface Props {
  data: ProductResponseAttr;
  qtd: number;
}

export const ProductCart = ({ data, qtd }: Props) => {
  const [counter, setCounter] = useState(qtd);
  const formatter = Formatter();

  const handleSetNewCounter = (count: number) => {
    setCounter(count);
    const cartJson = getCookie("cart");
    const cartCookie = cardCookieSchema.parse(JSON.parse(cartJson as string));

    const newCart: CardCookieType = [];

    cartCookie.forEach((item) => {
      if (item.id === data.id) {
        newCart.push({ qtd: count, id: item.id });
      } else {
        newCart.push(item);
      }
    });

    setCookie("cart", newCart);
  };

  return (
    <div className="w-full py-4">
      <div className="flex justify-between">
        <div className="flex gap-3 items-center">
          <div>
            <Image
              style={{
                width: "auto",
                height: "auto",
                maxHeight: "75px",
                maxWidth: "75px",
              }}
              src={data.attributes.image.url}
              height={85}
              width={85}
              alt={`${data.attributes.image.alt} - Imagem do menu`}
            />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-semibold">
              {data.attributes.category?.attributes.name}
            </p>
            <h5 className="text-base font-bold">{data.attributes.name}</h5>
            <h6 className="text-sm font-bold text-primary">
              {formatter.formatPrice(data.attributes.price)}
            </h6>
          </div>
        </div>
        <div className="flex items-center">
          <Counter
            handleMinus={() => handleSetNewCounter(counter - 1)}
            handlePlus={() => handleSetNewCounter(counter + 1)}
            value={counter}
          />
        </div>
      </div>
    </div>
  );
};
