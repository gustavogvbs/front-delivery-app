"use client";

import { Loader2 } from "lucide-react";

import { PanelPage } from "./panel-page";
import { PrintSettings } from "./print-settings";
import { StoreSections } from "./store-sections";
import { usePanelTenant } from "./use-panel";

/** Loja → Impressão. */
export function PrintSettingsView() {
  const tenant = usePanelTenant();
  return (
    <PanelPage width="read" className="space-y-4">
      <StoreSections />
      {tenant.data ? (
        <PrintSettings tenant={tenant.data} />
      ) : (
        <div className="flex justify-center py-10 text-zinc-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
    </PanelPage>
  );
}
