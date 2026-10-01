import type { Metadata } from "next";
import { Suspense } from "react";

import { PrintView } from "@/components/print/print-view";

// Fora do layout do painel (sem cabeçalho/abas): só a bobina.
export const metadata: Metadata = {
  title: "Imprimir pedido",
  robots: { index: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PrintPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense>
      <PrintView id={id} />
    </Suspense>
  );
}
