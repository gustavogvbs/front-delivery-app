import Image from "next/image";

import { ProductResponseAttr } from "@/contracts/product-response";
import { Formatter } from "@/lib/formatter";

interface Props {
  data: ProductResponseAttr;
  qtd: number;
}

export const ProductCheckout = ({ data, qtd }: Props) => {
  const formatter = Formatter();

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
        <div className="flex flex-col pr-4 gap-1">
          <span className="text-primary font-medium">qtd.</span>
          <div className="size-9 flex justify-center items-center ring-1 ring-zinc-200 rounded-sm ">
            <span className="text-primary font-semibold">{qtd}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
