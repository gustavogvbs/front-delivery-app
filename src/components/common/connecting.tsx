"use client";

import { useConnecting } from "@/lib/wake";
import { Loader2 } from "lucide-react";

/** Aviso exibido enquanto a API (Render gratuito) acorda. */
export function ConnectingBanner() {
  const visible = useConnecting();
  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md items-center justify-center gap-2 bg-zinc-900 px-4 py-2 text-sm text-white"
    >
      <Loader2 className="size-4 animate-spin" />
      Conectando ao servidor… isso pode levar alguns segundos.
    </div>
  );
}

export function FullPageMessage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
      {children}
    </main>
  );
}
