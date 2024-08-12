import { Payment } from "@/components/shared/payment";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ICartItem } from "@/schemas/cart-cookies";
import { ArrowLeftIcon } from "lucide-react";

import { ProductCart } from "./product-cart";

interface Props {
  status: boolean;
  handleStatus: () => void;
  data: ICartItem[];
}

export const CartContent = ({ status, handleStatus, data }: Props) => {
  return (
    <div
      data-status={status}
      className={cn(
        "w-[100vw] h-[100vh] absolute bottom-0 right-0 opacity-100 container-sm py-8 overflow-x-hidden overflow-y-scroll flex flex-col justify-between gap-6 transition-opacity duration-500",
        "data-[status=false]:opacity-0 data-[status=false]:hidden",
      )}
    >
      <div>
        <div className="relative w-full flex justify-center flex-col items-center gap-6">
          <div className="absolute top-0 left-0 flex justify-center items-center">
            <button onClick={handleStatus} className="mt-1">
              <ArrowLeftIcon className="size-6 text-primary " />
            </button>
          </div>
          <h3 className="text-2xl">Sacola</h3>
          <Separator />
        </div>
        <div className="py-3 flex flex-col gap-3">
          <p className="text-md font-semibold">
            {data.length <= 1 ? `${data.length} Item` : `${data.length} Itens`}{" "}
          </p>
          <Separator />
        </div>
        <div className="flex flex-col">
          {data &&
            data.map((item) => {
              return (
                <div
                  key={`cart-item${item.product.id}`}
                  className="flex flex-col"
                >
                  <ProductCart data={item.product} qtd={item.qtd} />
                  <Separator />
                </div>
              );
            })}
        </div>
      </div>

      <Payment />
    </div>
  );
};
