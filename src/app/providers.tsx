"use client";

import { ReactNode, useState } from "react";

import { Toaster } from "@/components/ui/sonner";
import { Provider as CartProvider } from "@/contexts/cart";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@lib/query-client";

interface Props {
  children: ReactNode;
}

export default function Providers({ children }: Props) {
  const [queryClientState] = useState(() => queryClient);

  return (
    <CartProvider>
      <QueryClientProvider client={queryClientState}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </CartProvider>
  );
}
