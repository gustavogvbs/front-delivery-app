import type { Metadata } from "next";
import { Suspense } from "react";

import { ConfirmationView } from "@/components/order/confirmation-view";

interface Props {
  params: Promise<{ tenant: string; id: string }>;
}

export const metadata: Metadata = {
  title: "Pedido registrado",
  robots: { index: false },
};

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense>
      <ConfirmationView id={id} />
    </Suspense>
  );
}
