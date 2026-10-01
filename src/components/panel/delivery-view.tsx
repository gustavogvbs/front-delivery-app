"use client";

import { useState } from "react";

import { LocationPicker } from "@/components/map/location-picker";
import { splitFieldError } from "@/lib/api-errors";
import { formatBRL, maskCep, maskMoney, onlyDigits } from "@/lib/format";
import { replaceTiers, updateSettings } from "@/services/panel-api";
import { lookupCep } from "@/services/public-api";
import type { LatLng } from "@/types/api";
import type { PanelTenant } from "@/types/panel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, inputClass } from "./settings-view";
import { panelKeys, usePanelTenant } from "./use-panel";

// Sem localização salva nem coordenadas do CEP: centro de São Paulo
const FALLBACK_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 };

/** Tela "Entrega": endereço + pino da loja e faixas de frete (lista). */
export function DeliveryView() {
  const tenant = usePanelTenant();
  if (!tenant.data) {
    return (
      <main className="flex justify-center py-10 text-zinc-400">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }
  const t = tenant.data;
  const maxKm = t.deliveryFeeTiers.at(-1)?.maxMeters;
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-4">
      <p
        className={`rounded-2xl p-4 text-sm ${
          t.acceptsDelivery
            ? "bg-emerald-50 text-emerald-900"
            : "bg-amber-50 text-amber-900"
        }`}
        data-testid="delivery-status"
      >
        {t.acceptsDelivery
          ? `Entrega ativa: até ${kmText(maxKm!)} km da loja (distância em linha reta).`
          : !t.location
            ? "Entrega desativada: marque a localização da loja no mapa."
            : "Entrega desativada: cadastre pelo menos uma faixa de entrega."}
        {!t.acceptsDelivery &&
          (t.acceptsPickup
            ? " Os clientes podem pedir para retirar."
            : " Ative a retirada na aba Loja, ou os clientes não conseguem pedir.")}
      </p>
      <AddressForm tenant={t} />
      <TiersForm key={JSON.stringify(t.deliveryFeeTiers)} tenant={t} />
    </main>
  );
}

const kmText = (meters: number) =>
  (meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1).replace(".", ",");

function AddressForm({ tenant }: { tenant: PanelTenant }) {
  const qc = useQueryClient();
  const a = tenant.address;
  const [cep, setCep] = useState(maskCep(a.cep ?? ""));
  const [street, setStreet] = useState(a.street ?? "");
  const [number, setNumber] = useState(a.number ?? "");
  const [complement, setComplement] = useState(a.complement ?? "");
  const [neighborhood, setNeighborhood] = useState(a.neighborhood ?? "");
  const [city, setCity] = useState(a.city);
  const [state, setState] = useState(a.state ?? "");
  const [pin, setPin] = useState<LatLng | null>(tenant.location);
  const [center, setCenter] = useState<LatLng>(
    tenant.location ?? FALLBACK_CENTER,
  );
  const [recenter, setRecenter] = useState(0);
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success("Endereço e localização salvos.");
    },
    onError: (err) => {
      const { field, message } = splitFieldError(err);
      setErrors({ [field ?? "form"]: message });
    },
  });

  const fillFromCep = async (masked: string) => {
    const digits = onlyDigits(masked);
    if (digits.length !== 8) return;
    setCepLoading(true);
    const found = await lookupCep(digits);
    setCepLoading(false);
    if (!found) {
      setErrors({ addressCep: "CEP não encontrado. Preencha o endereço." });
      return;
    }
    setErrors({});
    setStreet(found.street || street);
    setNeighborhood(found.neighborhood || neighborhood);
    setCity(found.city || city);
    setState(found.state || state);
    if (found.location && !pin) {
      setCenter(found.location);
      setRecenter((k) => k + 1);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    const errs: Record<string, string> = {};
    if (!city.trim()) errs.city = "Informe a cidade.";
    if (cep && onlyDigits(cep).length !== 8)
      errs.addressCep = "CEP deve ter 8 dígitos.";
    if (state && !/^[A-Za-z]{2}$/.test(state.trim()))
      errs.addressState = "Use a sigla (ex.: SP).";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    save.mutate({
      addressCep: onlyDigits(cep) || null,
      addressStreet: street.trim() || null,
      addressNumber: number.trim() || null,
      addressComplement: complement.trim() || null,
      addressNeighborhood: neighborhood.trim() || null,
      city: city.trim(),
      addressState: state.trim().toUpperCase() || null,
      latitude: pin?.lat ?? null,
      longitude: pin?.lng ?? null,
    });
  };

  return (
    <Card
      title="Endereço da loja"
      description="O pino no mapa é o ponto de partida do cálculo da entrega."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="CEP"
          error={errors.addressCep}
          hint={cepLoading ? "Buscando endereço…" : undefined}
        >
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            value={cep}
            onChange={(e) => {
              const v = maskCep(e.target.value);
              setCep(v);
              void fillFromCep(v);
            }}
            placeholder="00000-000"
            className={inputClass}
          />
        </Field>
        <Field label="Rua" error={errors.addressStreet}>
          <input
            value={street}
            onChange={(e) => setStreet(e.target.value.slice(0, 120))}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <Field label="Número" error={errors.addressNumber}>
            <input
              value={number}
              inputMode="numeric"
              onChange={(e) => setNumber(e.target.value.slice(0, 20))}
              className={inputClass}
            />
          </Field>
          <Field label="Complemento" error={errors.addressComplement}>
            <input
              value={complement}
              onChange={(e) => setComplement(e.target.value.slice(0, 80))}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Bairro" error={errors.addressNeighborhood}>
          <input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value.slice(0, 80))}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-[3fr_1fr] gap-3">
          <Field label="Cidade" error={errors.city}>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value.slice(0, 80))}
              className={inputClass}
            />
          </Field>
          <Field label="UF" error={errors.addressState}>
            <input
              value={state}
              maxLength={2}
              autoCapitalize="characters"
              onChange={(e) => setState(e.target.value.toUpperCase())}
              className={inputClass}
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">
            Localização da loja no mapa
          </p>
          <LocationPicker
            center={center}
            pin={pin}
            onPinChange={setPin}
            recenterKey={recenter}
            placeLabel="da loja"
          />
          {errors.latitude && (
            <p role="alert" className="mt-1 text-sm text-red-700">
              {errors.latitude}
            </p>
          )}
        </div>

        {errors.form && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {errors.form}
          </p>
        )}
        <button
          type="submit"
          disabled={save.isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="size-5 animate-spin" />}
          Salvar endereço e localização
        </button>
      </form>
    </Card>
  );
}

interface TierRow {
  key: number;
  km: string;
  fee: string;
}

let rowSeq = 0;
const row = (km = "", fee = ""): TierRow => ({ key: ++rowSeq, km, fee });

/** "2,5" ou "2.5" km → metros (inteiro). */
const kmToMeters = (km: string) => {
  const n = Number(km.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 1000) : NaN;
};

function TiersForm({ tenant }: { tenant: PanelTenant }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<TierRow[]>(() =>
    tenant.deliveryFeeTiers.map((t) =>
      row(kmText(t.maxMeters), formatBRL(t.feeCents)),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: replaceTiers,
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success(
        data.deliveryFeeTiers.length
          ? "Faixas de entrega salvas."
          : "Sem faixas: a entrega foi desativada.",
      );
    },
    onError: (err) => setError(splitFieldError(err).message),
  });

  const update = (key: number, patch: Partial<TierRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    setError(null);
    const tiers = rows
      .filter((r) => r.km.trim() !== "" || r.fee.trim() !== "")
      .map((r) => ({
        maxMeters: kmToMeters(r.km),
        feeCents: maskMoney(r.fee).cents ?? 0,
      }));
    if (tiers.some((t) => !Number.isFinite(t.maxMeters) || t.maxMeters <= 0)) {
      setError("Informe a distância de cada faixa em km (ex.: 3 ou 2,5).");
      return;
    }
    if (tiers.some((t) => t.maxMeters > 100_000)) {
      setError("A distância máxima é 100 km.");
      return;
    }
    tiers.sort((a, b) => a.maxMeters - b.maxMeters);
    if (tiers.some((t, i) => i > 0 && t.maxMeters === tiers[i - 1].maxMeters)) {
      setError("Há duas faixas com a mesma distância.");
      return;
    }
    save.mutate(tiers);
  };

  return (
    <Card
      title="Faixas de entrega"
      description="Cada faixa vale até a distância informada (em linha reta, a partir do pino da loja). Acima da última, o endereço fica fora da área."
    >
      <form onSubmit={submit} className="space-y-3" noValidate>
        {rows.length === 0 && (
          <p className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
            Nenhuma faixa: a loja não faz entregas.
          </p>
        )}
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.key}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
              data-testid="tier-row"
            >
              <Field label={i === 0 ? "Até (km)" : ""}>
                <input
                  inputMode="decimal"
                  value={r.km}
                  onChange={(e) =>
                    update(r.key, {
                      km: e.target.value.replace(/[^\d,.]/g, "").slice(0, 6),
                    })
                  }
                  placeholder="3"
                  aria-label={`Distância da faixa ${i + 1} em km`}
                  className={inputClass}
                />
              </Field>
              <Field label={i === 0 ? "Taxa" : ""}>
                <input
                  inputMode="numeric"
                  value={r.fee}
                  onChange={(e) =>
                    update(r.key, { fee: maskMoney(e.target.value).text })
                  }
                  placeholder="Grátis"
                  aria-label={`Taxa da faixa ${i + 1}`}
                  className={inputClass}
                />
              </Field>
              <button
                type="button"
                onClick={() =>
                  setRows((rs) => rs.filter((x) => x.key !== r.key))
                }
                className="flex size-12 items-center justify-center rounded-xl text-red-600"
                aria-label={`Remover faixa ${i + 1}`}
              >
                <Trash2 className="size-5" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, row()])}
          disabled={rows.length >= 20}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-400 text-sm font-semibold text-zinc-700 disabled:opacity-50"
        >
          <Plus className="size-4" />
          Adicionar faixa
        </button>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={save.isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="size-5 animate-spin" />}
          Salvar faixas
        </button>
      </form>
    </Card>
  );
}
