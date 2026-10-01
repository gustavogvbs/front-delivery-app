"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ConnectingBanner,
  FullPageMessage,
} from "@/components/common/connecting";
import { isApiError } from "@/lib/http";
import { useNewPendingOrders, useOrderSound } from "@/lib/order-alerts";
import { logout } from "@/services/panel-api";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { useActiveOrders, usePanelTenant, useSetStoreOpen } from "./use-panel";

const SECTIONS = [
  {
    href: "/painel",
    label: "Pedidos",
    match: (p: string) => p === "/painel" || p.startsWith("/painel/pedidos"),
  },
  {
    href: "/painel/cardapio",
    label: "Cardápio",
    match: (p: string) => p.startsWith("/painel/cardapio"),
  },
  {
    href: "/painel/entrega",
    label: "Entrega",
    match: (p: string) => p.startsWith("/painel/entrega"),
  },
  {
    href: "/painel/loja",
    label: "Loja",
    match: (p: string) => p.startsWith("/painel/loja"),
  },
];

/**
 * Moldura do painel: cabeçalho (loja, som, sair), aviso "Conectando…",
 * contador de pendentes no título da aba e som de pedido novo. Fica no
 * layout, então o aviso funciona em qualquer tela do painel.
 */
export function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const tenant = usePanelTenant();
  const active = useActiveOrders();
  const sound = useOrderSound();
  const setOpen = useSetStoreOpen();
  const [leaving, setLeaving] = useState(false);

  const storeName = tenant.data?.name ?? "Painel";
  const pendingCount = active.data?.pending.length ?? 0;

  // Título da aba: "(2) Pedidos — Loja". Reaplicado a cada atualização e
  // navegação (o Next troca o <title> ao mudar de página).
  useEffect(() => {
    document.title =
      pendingCount > 0
        ? `(${pendingCount}) Pedidos — ${storeName}`
        : `Pedidos — ${storeName}`;
  }, [pendingCount, storeName, pathname, active.dataUpdatedAt]);

  useNewPendingOrders(active.data?.pending, (fresh) => {
    sound.play();
    const numbers = fresh.map((o) => `#${o.number}`).join(", ");
    toast.info(
      fresh.length > 1 ? `Novos pedidos: ${numbers}` : `Novo pedido ${numbers}`,
      { description: fresh.map((o) => o.customerName).join(", ") },
    );
  });

  const doLogout = async () => {
    setLeaving(true);
    try {
      await logout();
    } catch {
      // mesmo sem resposta, sai: o cookie expira sozinho
    }
    qc.clear();
    router.replace("/painel/login");
  };

  if (tenant.isError) {
    const forbidden = isApiError(tenant.error) && tenant.error.status === 403;
    return (
      <FullPageMessage
        title={
          forbidden
            ? "Este acesso é só para lojas"
            : "Não foi possível abrir o painel"
        }
      >
        {forbidden ? (
          <button
            className="h-12 rounded-xl bg-zinc-900 px-6 font-semibold text-white"
            onClick={doLogout}
          >
            Sair
          </button>
        ) : (
          <button
            className="h-12 rounded-xl bg-zinc-900 px-6 font-semibold text-white"
            onClick={() => tenant.refetch()}
          >
            Tentar de novo
          </button>
        )}
      </FullPageMessage>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-50">
      <ConnectingBanner />
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link href="/painel" className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-zinc-900">
              {tenant.data?.name ?? "Carregando…"}
            </span>
            <span className="block text-xs text-zinc-500">Painel da loja</span>
          </Link>
          <button
            type="button"
            onClick={sound.toggle}
            aria-pressed={sound.enabled}
            className={`flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium ${
              sound.enabled
                ? "bg-emerald-50 text-emerald-800"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {sound.enabled ? (
              <Bell className="size-4" />
            ) : (
              <BellOff className="size-4" />
            )}
            <span>{sound.enabled ? "Som ligado" : "Som desligado"}</span>
          </button>
          <button
            type="button"
            onClick={doLogout}
            disabled={leaving}
            className="flex size-11 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
            aria-label="Sair"
            title="Sair"
          >
            {leaving ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <LogOut className="size-5" />
            )}
          </button>
        </div>
        {sound.enabled && sound.blocked && (
          <p className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
            Toque em qualquer lugar da tela para liberar o som dos avisos.
          </p>
        )}
        <nav
          aria-label="Seções do painel"
          className="mx-auto grid max-w-3xl grid-cols-4 border-t px-2"
        >
          {SECTIONS.map((s) => {
            const current = s.match(pathname);
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={current ? "page" : undefined}
                className={`relative flex h-11 items-center justify-center gap-1 text-sm font-medium ${
                  current
                    ? "text-zinc-900 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-zinc-900"
                    : "text-zinc-500"
                }`}
              >
                {s.label}
                {s.href === "/painel" && pendingCount > 0 && (
                  <span className="min-w-5 rounded-full bg-amber-400 px-1.5 text-center text-xs font-bold text-amber-950">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {tenant.data && !tenant.data.isOpen && (
          <div className="flex items-center justify-between gap-3 bg-red-50 px-4 py-2 text-sm text-red-800">
            <span>
              Loja <strong>fechada</strong>: os clientes não conseguem pedir.
            </span>
            <button
              type="button"
              onClick={() => setOpen.mutate(true)}
              disabled={setOpen.isPending}
              className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-red-600 px-3 font-semibold text-white disabled:opacity-60"
            >
              {setOpen.isPending && <Loader2 className="size-4 animate-spin" />}
              Abrir agora
            </button>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
