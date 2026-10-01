import { Suspense } from "react";

import { MenuView } from "@/components/menu/menu-view";

interface Props {
  params: Promise<{ tenant: string }>;
}

// Os dados vêm no navegador (com "Conectando ao servidor…" no cold start da API).
export default async function TenantPage({ params }: Props) {
  const { tenant } = await params;
  return (
    <Suspense>
      <MenuView slug={tenant} />
    </Suspense>
  );
}
