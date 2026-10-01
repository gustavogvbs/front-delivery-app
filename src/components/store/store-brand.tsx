import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import type { ImageView } from "@/types/api";

const FALLBACK = "#FB9400";
const isHex = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);

/** Aplica a cor da loja como CSS variable (--brand), com fallback. */
export function BrandScope({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  const brand = isHex(color) ? color : FALLBACK;
  return (
    <div
      style={{ "--brand": brand } as CSSProperties}
      className="min-h-dvh bg-zinc-50"
    >
      {children}
    </div>
  );
}

/** Logo da loja ou, sem logo, as iniciais sobre a cor da loja. */
export function StoreAvatar({
  logo,
  initials,
  name,
  size = 64,
}: {
  logo: ImageView | null;
  initials: string;
  name: string;
  size?: number;
}) {
  if (logo) {
    return (
      <Image
        src={logo.url}
        alt={logo.alt || `Logo de ${name}`}
        width={size}
        height={size}
        className="rounded-2xl bg-white object-cover shadow-sm"
        style={{ width: size, height: size }}
        priority
      />
    );
  }
  return (
    <div
      aria-label={`Logo de ${name}`}
      role="img"
      className="flex items-center justify-center rounded-2xl bg-brand font-title text-2xl text-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
