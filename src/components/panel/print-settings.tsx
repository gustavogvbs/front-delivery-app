"use client";

import { isApiError } from "@/lib/http";
import { copiesFor, printOrder, useAutoPrintPrefs } from "@/lib/print";
import { updateSettings } from "@/services/panel-api";
import type { PanelTenant, SettingsPatch } from "@/types/panel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Card } from "./settings-view";
import { panelKeys } from "./use-panel";

/**
 * Loja → Impressão. Largura e vias são da LOJA (salvas no banco);
 * a impressão automática é DESTE APARELHO (localStorage).
 */
export function PrintSettings({ tenant }: { tenant: PanelTenant }) {
  const qc = useQueryClient();
  const { prefs, set } = useAutoPrintPrefs();
  const save = useMutation({
    mutationFn: (patch: SettingsPatch) => updateSettings(patch),
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success("Impressão atualizada.");
    },
    onError: (err) =>
      toast.error(
        isApiError(err) && err.status !== 0
          ? err.message
          : "Sem conexão com o servidor. Tente de novo.",
      ),
  });
  const noCopy = copiesFor(tenant) === null;
  const autoOn = prefs.accept || prefs.manual;

  return (
    <Card
      title="Impressão"
      description="Impressora térmica de 58 ou 80 mm, configurada como impressora padrão do computador."
    >
      <div className="space-y-4">
        <fieldset disabled={save.isPending}>
          <legend className="text-sm font-medium text-zinc-700">
            Largura da bobina (vale para todos os aparelhos)
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([80, 58] as const).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={tenant.printPaperWidth === w}
                onClick={() => save.mutate({ printPaperWidth: w })}
                className={`h-12 rounded-xl border-2 font-semibold ${
                  tenant.printPaperWidth === w
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 text-zinc-700"
                }`}
              >
                {w} mm
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={save.isPending} className="space-y-2">
          <legend className="text-sm font-medium text-zinc-700">
            Vias a imprimir (vale para todos os aparelhos)
          </legend>
          {(
            [
              [
                "printKitchenCopy",
                "Via da cozinha",
                "Número grande, itens e observações, sem preços.",
              ],
              [
                "printDeliveryCopy",
                "Via de entrega / cliente",
                "Também nome, telefone, endereço, pagamento, troco e total.",
              ],
            ] as const
          ).map(([key, label, hint]) => (
            <label
              key={key}
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-300 px-3 py-2"
            >
              <span>
                <span className="block text-base text-zinc-800">{label}</span>
                <span className="block text-xs text-zinc-500">{hint}</span>
              </span>
              <input
                type="checkbox"
                checked={tenant[key]}
                onChange={(e) => save.mutate({ [key]: e.target.checked })}
                className="size-6 shrink-0 accent-zinc-900"
              />
            </label>
          ))}
        </fieldset>

        <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-900">
            Impressão automática — só neste aparelho
          </p>
          <p className="text-xs text-zinc-600">
            Ative no computador ligado à impressora. No celular, deixe
            desligado: ele não tem impressora e a via não sairia na cozinha.
          </p>
          {(
            [
              ["accept", "Imprimir ao aceitar pedido online"],
              ["manual", "Imprimir ao registrar pedido manual"],
            ] as const
          ).map(([kind, label]) => (
            <label
              key={kind}
              className="flex min-h-12 items-center justify-between gap-3"
            >
              <span className="text-base text-zinc-800">{label}</span>
              <input
                type="checkbox"
                checked={prefs[kind]}
                onChange={(e) => set(kind, e.target.checked)}
                className="size-6 shrink-0 accent-zinc-900"
                aria-label={`${label} neste aparelho`}
              />
            </label>
          ))}
          {autoOn && noCopy && (
            <p
              role="alert"
              className="rounded-lg bg-amber-100 p-2 text-sm text-amber-900"
            >
              Nenhuma via está marcada: a impressão automática não vai disparar.
              Marque a via da cozinha ou a de entrega.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => printOrder("teste", copiesFor(tenant) ?? "ambas")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 font-semibold text-zinc-800"
        >
          {save.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Printer className="size-5" />
          )}
          Imprimir teste
        </button>
      </div>
    </Card>
  );
}
