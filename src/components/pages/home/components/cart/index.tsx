/* eslint-disable @tanstack/query/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";

import { useCartContext } from "@/contexts/cart";
import { cn } from "@/lib/utils";
import { ICartItem } from "@/schemas/cart-cookies";
import { ShoppingCart } from "lucide-react";

import { CartContent } from "./cart-content";

interface Props {
  initialData: ICartItem[];
}

export const CartPopup = ({ initialData }: Props) => {
  const [status, setStatus] = useState(false);
  const { cart, length, setCart } = useCartContext();

  useEffect(() => {
    setCart(initialData);
    console.log(length);
  });

  return (
    <div
      data-visible={length}
      data-status={status}
      className={cn(
        "bg-white",
        "fixed z-40 bottom-0 right-0 size-12 data-[visible=false]:hidden data-[visible=true]:block transition-all  duration-1000",
        "data-[status=false]:rounded-[48px] data-[status=false]:-translate-x-6 data-[status=false]:-translate-y-8",
        "data-[status=true]:rounded-none data-[status=true]:size-full data-[status=true]:bottom-0 data-[status=true]:right-0 data-[status=true]:overflow-hidden",
      )}
    >
      <button
        onClick={() => setStatus(!status)}
        data-status={status}
        className={cn(
          "absolute z-40 bottom-0 right-0 size-12 bg-primary rounded-full transition-all duration-400 flex items-center justify-center shadow-lg shadow-zinc-900/20 p-0",
          "data-[status=true]:opacity-0 data-[status=true]:size-0",
          "data-[status=false]:opacity-100",
        )}
      >
        <ShoppingCart className="size-6 text-zinc-50" />
        <span className="absolute top-0 right-0 size-4 shadow-md shadow-zinc-700/20 bg-white rounded-full flex justify-center items-center text-xs font-semibold">
          {length}
        </span>
      </button>
      <CartContent
        data={cart}
        status={status}
        handleStatus={() => setStatus(!status)}
      />
    </div>
  );
};
