"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import type { LatLng } from "@/types/api";
import { Crosshair, Loader2, MapPin } from "lucide-react";

// Leaflet acessa `window`: renderização só no cliente.
const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-500">
      Carregando mapa…
    </div>
  ),
});

interface Props {
  /** centro inicial: CEP (se a BrasilAPI trouxe coordenadas) ou a loja */
  center: LatLng;
  pin: LatLng | null;
  onPinChange: (pin: LatLng) => void;
  recenterKey?: string | number;
}

export function geolocationErrorMessage(
  code: number | "unsupported" | "insecure",
): string {
  switch (code) {
    case 1:
      return "Você não permitiu o acesso à localização. Toque no mapa ou arraste o pino até o seu endereço.";
    case 2:
      return "Não foi possível obter sua localização agora. Toque no mapa ou arraste o pino até o seu endereço.";
    case 3:
      return "A localização demorou demais para responder. Tente de novo ou posicione o pino no mapa.";
    case "insecure":
      return "A localização automática só funciona em conexão segura (https). Posicione o pino no mapa.";
    default:
      return "Seu navegador não oferece localização automática. Posicione o pino no mapa.";
  }
}

export function LocationPicker({
  center,
  pin,
  onPinChange,
  recenterKey,
}: Props) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [localKey, setLocalKey] = useState(0);

  const place = useCallback(
    (p: LatLng) => {
      setGeoError(null);
      onPinChange(p);
    },
    [onPinChange],
  );

  const useMyLocation = () => {
    setGeoError(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setGeoError(geolocationErrorMessage("insecure"));
      return;
    }
    if (!("geolocation" in navigator)) {
      setGeoError(geolocationErrorMessage("unsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onPinChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocalKey((k) => k + 1); // recentraliza no ponto obtido
      },
      (err) => {
        setLocating(false);
        setGeoError(geolocationErrorMessage(err.code));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="space-y-2">
      <LocationMap
        center={center}
        pin={pin}
        onPinChange={place}
        recenterKey={`${recenterKey ?? ""}-${localKey}`}
      />
      <p className="flex items-start gap-2 text-sm text-zinc-600">
        <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
        {pin
          ? "Confira o pino: arraste ou toque no mapa para ajustar."
          : "Toque no mapa no local da entrega para posicionar o pino."}
      </p>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white font-semibold text-zinc-800 disabled:opacity-60"
      >
        {locating ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Crosshair className="size-5" />
        )}
        {locating ? "Obtendo localização…" : "Usar minha localização"}
      </button>
      {geoError && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          {geoError}
        </p>
      )}
    </div>
  );
}
