"use client";

import { useState } from "react";

import { splitFieldError } from "@/lib/api-errors";
import { bpsText, percentToBps } from "@/lib/service-fee";
import { updateSettings } from "@/services/panel-api";
import type { PanelTenant, SettingsPatch } from "@/types/panel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, inputClass } from "./settings-view";
import { panelKeys } from "./use-panel";

/**
 * Loja → Dados: taxa de serviço das comandas. Desligada por padrão; quando
 * ligada, entra no fechamento da conta e pode ser retirada (é opcional para o
 * cliente).
 */
export function ServiceFeeSettings({ tenant }: { tenant: PanelTenant }) {
  const qc = useQueryClient();
  const [percent, setPercent] = useState(
    bpsText(tenant.serviceFeeBps).replace("%", ""),
  );
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (patch: SettingsPatch) => updateSettings(patch),
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      setError(null);
      toast.success(
        data.serviceFeeEnabled
          ? `Taxa de serviço de ${bpsText(data.serviceFeeBps)} ligada.`
          : "Taxa de serviço desligada.",
      );
    },
    onError: (err) => {
      const { message } = splitFieldError(err);
      setError(message);
    },
  });

  const submitPercent = (e: React.FormEvent) => {
    e.preventDefault();
    const bps = percentToBps(percent);
    if (bps === null) {
      setError("Informe de 0,01% a 20% (ex.: 10 ou 12,5).");
      return;
    }
    save.mutate({ serviceFeeBps: bps });
  };

  return (
    <Card
      title="Taxa de serviço (comandas)"
      description="Cobrada no fechamento da comanda, sobre os pedidos válidos. É opcional para o cliente: dá para retirar na hora de fechar."
    >
      <div className="space-y-3">
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-300 px-3 py-2">
          <span className="text-base text-zinc-800">
            Cobrar taxa de serviço
          </span>
          <input
            type="checkbox"
            checked={tenant.serviceFeeEnabled}
            disabled={save.isPending}
            onChange={(e) =>
              save.mutate({ serviceFeeEnabled: e.target.checked })
            }
            className="size-6 shrink-0 accent-zinc-900"
          />
        </label>
        <form onSubmit={submitPercent} className="space-y-2">
          <div>
            <Field
              label="Percentual (%)"
              hint="De 0,01% a 20%. Arredondamento: meio centavo para cima."
              error={error}
            >
              <input
                value={percent}
                inputMode="decimal"
                onChange={(e) =>
                  setPercent(e.target.value.replace(/[^\d,.]/g, "").slice(0, 6))
                }
                className={inputClass}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={save.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 font-semibold text-zinc-800 disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar percentual
          </button>
        </form>
      </div>
    </Card>
  );
}
