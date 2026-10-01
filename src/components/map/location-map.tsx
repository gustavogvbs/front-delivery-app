"use client";

// Só carregado no navegador (ver location-picker.tsx: next/dynamic com ssr: false).
import "leaflet/dist/leaflet.css";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { LatLng } from "@/types/api";
import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Bundlers quebram a detecção automática do caminho dos ícones do Leaflet
// (o marcador "some"). Apontamos para as imagens empacotadas pelo Next.
const src = (img: string | { src: string }) =>
  typeof img === "string" ? img : img.src;
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: src(iconUrl),
  iconRetinaUrl: src(iconRetinaUrl),
  shadowUrl: src(shadowUrl),
});

export interface LocationMapProps {
  center: LatLng;
  pin: LatLng | null;
  onPinChange: (pin: LatLng) => void;
  /** muda quando o centro deve ser reaplicado (ex.: CEP encontrado, "minha localização") */
  recenterKey?: string | number;
}

function Recenter({
  center,
  zoom,
  recenterKey,
}: {
  center: LatLng;
  zoom: number;
  recenterKey?: string | number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);
  return null;
}

function TapToPlace({ onPinChange }: { onPinChange: (p: LatLng) => void }) {
  useMapEvents({
    click: (e) => onPinChange({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

export default function LocationMap({
  center,
  pin,
  onPinChange,
  recenterKey,
}: LocationMapProps) {
  const eventHandlers = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng();
        onPinChange({ lat: p.lat, lng: p.lng });
      },
    }),
    [onPinChange],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={16}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-xl"
      aria-label="Mapa para confirmar o local de entrega"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <Recenter center={pin ?? center} zoom={17} recenterKey={recenterKey} />
      <TapToPlace onPinChange={onPinChange} />
      {pin && (
        <Marker
          position={[pin.lat, pin.lng]}
          draggable
          eventHandlers={eventHandlers}
        />
      )}
    </MapContainer>
  );
}
