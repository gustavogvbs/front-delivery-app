import { ProductResponseAttr } from "@/contracts/product-response";

import { CardProducts } from "./card-products";

interface Props {
  data?: ProductResponseAttr[];
  title: string;
}

export default function MenuProducts({ data, title }: Props) {
  return (
    <div className="w-full flex flex-col gap-2 container-sm py-4">
      {title && (
        <div className="py-4">
          <h3 className="font-title text-3xl text-zinc-700">{title}</h3>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-4">
          {data.map((product) => {
            return (
              <CardProducts
                key={product.id}
                product={product}
                category={title}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
