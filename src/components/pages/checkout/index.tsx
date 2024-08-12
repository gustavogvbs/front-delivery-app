"use client";

import { useRouter } from "next/navigation";

import { WrapperInput } from "@/components/shared/buttons/wrapper-input";
import { Payment } from "@/components/shared/payment";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ICartItem } from "@/schemas/cart-cookies";
import {
  ArrowLeftIcon,
  CircleDollarSignIcon,
  CreditCard,
  QrCode,
} from "lucide-react";

import * as ToggleRoot from "@components/ui/toggle-group";

import { ProductCheckout } from "./product-checkout";

interface Props {
  data: ICartItem[];
}

const CheckoutLayout = ({ data }: Props) => {
  const router = useRouter();

  const handleReturnToHome = () => {
    router.back();
  };

  return (
    <div
      className={cn(
        "w-[100vw] h-[100vh] absolute bottom-0 right-0 opacity-100 container-sm py-8 overflow-x-hidden overflow-y-scroll flex flex-col justify-between gap-6 transition-opacity duration-500",
      )}
    >
      <div>
        <div className="relative w-full flex justify-center flex-col items-center gap-6">
          <div className="absolute top-0 left-0 flex justify-center items-center">
            <button className="mt-1" onClick={handleReturnToHome}>
              <ArrowLeftIcon className="size-6 text-primary " />
            </button>
          </div>
          <h3 className="text-2xl">Checkout</h3>
          <Separator />
        </div>
        <div className="flex flex-col gap-1 py-4">
          <p className="text-lg font-medium text-zinc-800">Endereço</p>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 py-4">
          <p className="text-lg font-medium text-zinc-800">
            Forma de pagamento
          </p>
          <ToggleRoot.ToggleGroup
            type="single"
            defaultValue="1"
            className="gap-3"
          >
            <ToggleRoot.ToggleGroupItem
              value="1"
              size="auto"
              className="toggle-payment"
            >
              <span>
                <CircleDollarSignIcon className="size-5" />
              </span>
              Dinheiro
            </ToggleRoot.ToggleGroupItem>
            <ToggleRoot.ToggleGroupItem
              value="2"
              size="auto"
              className="toggle-payment"
            >
              <span>
                <QrCode className="size-5" />
              </span>
              Pix
            </ToggleRoot.ToggleGroupItem>
            <ToggleRoot.ToggleGroupItem
              value="3"
              size="auto"
              className="toggle-payment"
            >
              <span>
                <CreditCard className="size-5" />
              </span>
              Cartão
            </ToggleRoot.ToggleGroupItem>
          </ToggleRoot.ToggleGroup>
        </div>
        <div className="flex flex-col gap-1 py-4">
          <p className="text-lg font-medium text-zinc-800">Troco</p>
          <WrapperInput icon="R$">
            <Input className="text-right p-0 pr-3 h-auto border-0 shadow-none ring-0 text-base font-medium text-zinc-600 bg-zinc-100  border-zinc-100  focus-visible:ring-0 focus-visible:border-0" />
          </WrapperInput>
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
                  <ProductCheckout data={item.product} qtd={item.qtd} />
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

export default CheckoutLayout;

{
  /*  */
}
