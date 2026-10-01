import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout/checkout-view";

interface Props {
  params: Promise<{ tenant: string }>;
}

export const metadata: Metadata = {
  title: "Finalizar pedido",
  robots: { index: false },
};

export default async function CheckoutPage({ params }: Props) {
  const { tenant } = await params;
  return <CheckoutView slug={tenant} />;
}
