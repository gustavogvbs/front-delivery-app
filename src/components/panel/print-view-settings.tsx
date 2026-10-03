"use client";

import { Loader2 } from "lucide-react";

import { PrintSettings } from "./print-settings";
import { StoreSections } from "./store-sections";
import { usePanelTenant } from "./use-panel";

/** Loja → Impressão. */
export function PrintSettingsView() {
  const tenant = usePanelTenant();
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-4">
      <StoreSections />
      {tenant.data ? (
        <PrintSettings tenant={tenant.data} />
      ) : (
        <div className="flex justify-center py-10 text-zinc-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
    </main>
  );
}
