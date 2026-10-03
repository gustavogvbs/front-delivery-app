import type { Metadata } from "next";
import { Suspense } from "react";

import { PreBillView } from "@/components/print/prebill-view";

// Fora do layout do painel (sem cabeçalho/abas): só a bobina.
export const metadata: Metadata = {
  title: "Pré-conta",
  robots: { index: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PreBillPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense>
      <PreBillView id={id} />
    </Suspense>
  );
}
