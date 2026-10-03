"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ConnectingBanner,
  FullPageMessage,
} from "@/components/common/connecting";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getDesktop, useDesktopUpdate, useIsDesktop } from "@/lib/desktop";
import { isApiError } from "@/lib/http";
import { useNewPendingOrders, useOrderSound } from "@/lib/order-alerts";
import { readText, writeText } from "@/lib/storage";
import { logout } from "@/services/panel-api";
import type { PanelTenant } from "@/types/panel";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  ChevronRight,
  Ellipsis,
  ExternalLink,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import {
  currentNavItem,
  NAV_ITEMS,
  type NavItem,
  showNewOrderFab,
} from "./nav-config";
import { StoreStatus } from "./store-status";
import { useActiveOrders, usePanelTenant } from "./use-panel";

const SIDEBAR_KEY = "panel:sidebar";

/**
 * Moldura do painel em três formatos (a navegação vem de NAV_ITEMS):
 * - celular (< 768 px): barra superior compacta, barra inferior (Pedidos,
 *   Mesas, Cardápio, Mais) e botão "+" de Novo pedido;
 * - tablet (768–1023 px): trilho lateral com ícone e rótulo;
 * - desktop (≥ 1024 px): barra lateral recolhível (preferência do aparelho).
 * O topo traz sempre o status da loja (abrir/fechar) e o som. Também cuida
 * do aviso "Conectando…", do contador no título da aba e do som de pedido novo.
 *
 * Variáveis para as barras fixas das telas: --panel-left (onde começa o
 * conteúdo) e --panel-bottom (altura da barra inferior no celular).
 */
export function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const tenant = usePanelTenant();
  const active = useActiveOrders();
  const sound = useOrderSound();
  const [leaving, setLeaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [more, setMore] = useState(false);
  // no app desktop o áudio já é liberado (sem "toque para liberar o som")
  const isDesktop = useIsDesktop();
  // app desktop: atualização baixada (aviso discreto; reiniciar é escolha do atendente)
  const desktopUpdate = useDesktopUpdate();

  useEffect(() => {
    setCollapsed(readText("local", SIDEBAR_KEY) === "collapsed");
  }, []);
  const toggleSidebar = () =>
    setCollapsed((c) => {
      writeText("local", SIDEBAR_KEY, c ? "expanded" : "collapsed");
      return !c;
    });
  // fecha o "Mais" ao navegar
  useEffect(() => setMore(false), [pathname]);

  const storeName = tenant.data?.name ?? "Painel";
  const pendingOnline = active.data?.pending.filter(
    (o) => o.source === "ONLINE",
  );
  const pendingCount = pendingOnline?.length ?? 0;

  // Título da aba: "(2) Pedidos — Loja". Reaplicado a cada atualização e
  // navegação (o Next troca o <title> ao mudar de página).
  useEffect(() => {
    document.title =
      pendingCount > 0
        ? `(${pendingCount}) Pedidos — ${storeName}`
        : `Pedidos — ${storeName}`;
  }, [pendingCount, storeName, pathname, active.dataUpdatedAt]);

  useNewPendingOrders(pendingOnline, (fresh) => {
    sound.play();
    // app desktop: notificação do Windows (o app só mostra com a janela oculta)
    const desktop = getDesktop();
    for (const o of fresh)
      desktop?.notificarPedidoNovo({ id: o.id, numero: o.number });
    const numbers = fresh.map((o) => `#${o.number}`).join(", ");
    toast.info(
      fresh.length > 1 ? `Novos pedidos: ${numbers}` : `Novo pedido ${numbers}`,
      { description: fresh.map((o) => o.customerName).join(", ") },
    );
  });

  // app desktop: estado para a atualização automática, que só reinicia o app
  // com a loja FECHADA e nenhum pedido em andamento (pendente ou aceito)
  const lojaAberta = tenant.data?.isOpen;
  const emAndamento = active.data
    ? active.data.pending.length + active.data.accepted.length
    : undefined;
  useEffect(() => {
    if (lojaAberta === undefined || emAndamento === undefined) return;
    getDesktop()?.informarEstado({ lojaAberta, pendentes: emAndamento });
  }, [lojaAberta, emAndamento, active.dataUpdatedAt]);

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
        <button
          className="h-12 rounded-xl bg-zinc-900 px-6 font-semibold text-white"
          onClick={forbidden ? doLogout : () => tenant.refetch()}
        >
          {forbidden ? "Sair" : "Tentar de novo"}
        </button>
      </FullPageMessage>
    );
  }

  const badge = (item: NavItem) =>
    item.badge === "pending" && pendingCount > 0 ? pendingCount : null;
  const section = currentNavItem(pathname);
  const fab = showNewOrderFab(pathname);
  const onNewOrder = pathname === "/painel/pedidos/novo";

  return (
    <div
      className={`min-h-dvh bg-zinc-50 [--panel-bottom:calc(4rem+env(safe-area-inset-bottom))] [--panel-left:0px] md:[--panel-bottom:0px] md:[--panel-left:5rem] ${
        collapsed ? "" : "lg:[--panel-left:15rem]"
      }`}
    >
      {/* toasts acima da barra inferior no celular; ao rolar até um campo ou
          botão (foco, scrollIntoView), descontar o topo fixo e as barras do
          rodapé (barra inferior, + e barra de ação) para nada ficar escondido */}
      <style>{`html { scroll-padding-top: 5rem; scroll-padding-bottom: 1rem; }
@media (max-width: 1023px) { html { scroll-padding-bottom: calc(10rem + env(safe-area-inset-bottom)); } }
@media (max-width: 767px) { [data-sonner-toaster][data-y-position="bottom"] { bottom: calc(5rem + env(safe-area-inset-bottom)) !important; } }`}</style>
      <ConnectingBanner />

      {/* ── barra lateral (desktop) / trilho (tablet) ── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--panel-left)] flex-col border-r bg-white md:flex"
        aria-label="Menu do painel"
      >
        <Link
          href="/painel"
          className={`flex h-16 shrink-0 items-center justify-center gap-3 border-b px-4 ${
            collapsed ? "" : "lg:justify-start"
          }`}
        >
          <StoreBadge tenant={tenant.data} />
          {!collapsed && (
            <span className="hidden min-w-0 lg:block">
              <span className="block truncate font-semibold text-zinc-900">
                {tenant.data?.name ?? "Carregando…"}
              </span>
              <span className="block text-xs text-zinc-500">
                Painel da loja
              </span>
            </span>
          )}
        </Link>
        <nav
          aria-label="Seções do painel"
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
        >
          {NAV_ITEMS.map((item) => (
            <SideLink
              key={item.key}
              item={item}
              current={item.match(pathname)}
              badge={badge(item)}
              collapsed={collapsed}
            />
          ))}
        </nav>
        <button
          type="button"
          onClick={toggleSidebar}
          className="m-2 hidden h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 lg:flex"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <>
              <PanelLeftClose className="size-5" />
              Recolher
            </>
          )}
        </button>
      </aside>

      <div className="md:pl-[var(--panel-left)]">
        {/* ── barra superior ── */}
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4 md:h-16 md:px-6">
            {/* celular: só a pílula de status (o nome da loja fica no "Mais");
                tablet/desktop: título da seção */}
            <span className="hidden min-w-0 flex-1 truncate text-xl font-bold text-zinc-900 md:block">
              {section?.label ?? "Painel"}
            </span>
            {!onNewOrder && (
              <Link
                href="/painel/pedidos/novo"
                className="hidden h-11 shrink-0 items-center gap-1.5 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 md:flex"
                data-testid="new-order-top"
              >
                <Plus className="size-5" />
                Novo pedido
              </Link>
            )}
            {tenant.data && (
              <div className="order-first flex min-w-0 md:order-none">
                <StoreStatus tenant={tenant.data} />
              </div>
            )}
            <span className="flex-1 md:hidden" aria-hidden />
            <button
              type="button"
              onClick={sound.toggle}
              aria-pressed={sound.enabled}
              aria-label={sound.enabled ? "Som ligado" : "Som desligado"}
              title={sound.enabled ? "Som ligado" : "Som desligado"}
              className={`flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-medium lg:w-auto lg:px-3 ${
                sound.enabled
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {sound.enabled ? (
                <Bell className="size-5" />
              ) : (
                <BellOff className="size-5" />
              )}
              <span className="hidden lg:inline">
                {sound.enabled ? "Som ligado" : "Som desligado"}
              </span>
            </button>
            {desktopUpdate && (
              <button
                type="button"
                onClick={() => getDesktop()?.reiniciarParaAtualizar?.()}
                title="Atualização do app pronta. Reinicia o app (leva alguns segundos)."
                className="hidden h-11 shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 md:flex"
                data-testid="desktop-update"
              >
                <RefreshCw className="size-4" />
                Atualização pronta — reiniciar agora
              </button>
            )}
            {tenant.data && (
              <AccountMenu
                tenant={tenant.data}
                leaving={leaving}
                onLogout={doLogout}
              />
            )}
          </div>
          {sound.enabled && sound.blocked && !isDesktop && (
            <p className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
              Toque em qualquer lugar da tela para liberar o som dos avisos.
            </p>
          )}
        </header>

        <div
          className={
            fab
              ? "pb-[calc(var(--panel-bottom)+4.5rem)] md:pb-0"
              : "pb-[var(--panel-bottom)]"
          }
        >
          {children}
        </div>
      </div>

      {/* ── celular: botão "+" e barra inferior ── */}
      {fab && (
        <Link
          href="/painel/pedidos/novo"
          aria-label="Novo pedido"
          data-testid="new-order-fab"
          className="fixed bottom-[calc(var(--panel-bottom)+1rem)] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-900/30 active:scale-95 md:hidden"
        >
          <Plus className="size-7" />
        </Link>
      )}
      <nav
        aria-label="Seções do painel"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid h-16 grid-cols-4">
          {NAV_ITEMS.filter((i) => i.mobile === "primary").map((item) => (
            <BottomLink
              key={item.key}
              item={item}
              current={item.match(pathname)}
              badge={badge(item)}
            />
          ))}
          <button
            type="button"
            onClick={() => setMore(true)}
            aria-haspopup="dialog"
            aria-current={
              NAV_ITEMS.some((i) => i.mobile === "more" && i.match(pathname))
                ? "page"
                : undefined
            }
            className="relative flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-zinc-500 aria-[current=page]:text-zinc-900"
          >
            <Ellipsis className="size-6" />
            Mais
          </button>
        </div>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent title="Mais" description={tenant.data?.name}>
          <ul className="p-2" data-testid="more-menu">
            {NAV_ITEMS.filter((i) => i.mobile === "more").map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={item.match(pathname) ? "page" : undefined}
                    className="flex h-14 items-center gap-3 rounded-xl px-3 font-medium text-zinc-800 hover:bg-zinc-50 aria-[current=page]:bg-zinc-100"
                  >
                    <Icon className="size-5 text-zinc-500" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="size-5 text-zinc-400" />
                  </Link>
                </li>
              );
            })}
            <li className="my-2 border-t" aria-hidden />
            {tenant.data && (
              <li>
                <a
                  href={`/${tenant.data.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 items-center gap-3 rounded-xl px-3 font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  <ExternalLink className="size-5 text-zinc-500" />
                  Ver meu cardápio
                </a>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={doLogout}
                disabled={leaving}
                className="flex h-14 w-full items-center gap-3 rounded-xl px-3 font-medium text-red-700 hover:bg-red-50"
              >
                {leaving ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <LogOut className="size-5" />
                )}
                Sair
              </button>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StoreBadge({ tenant }: { tenant: PanelTenant | undefined }) {
  if (tenant?.logo)
    return (
      <img
        src={tenant.logo.url}
        alt=""
        className="size-9 shrink-0 rounded-lg object-cover"
      />
    );
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
      {tenant?.initials ?? ""}
    </span>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span
      className="min-w-5 rounded-full bg-amber-400 px-1.5 text-center text-xs font-bold leading-5 text-amber-950"
      data-testid="pending-count"
    >
      {value}
    </span>
  );
}

/** Item da barra lateral: completo no desktop; ícone + rótulo pequeno no trilho. */
function SideLink({
  item,
  current,
  badge,
  collapsed,
}: {
  item: NavItem;
  current: boolean;
  badge: number | null;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      // o contador fica antes do texto no visual; o nome acessível começa pelo item
      aria-label={
        badge !== null ? `${item.label} · ${badge} pendentes` : undefined
      }
      title={item.label}
      className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] font-medium ${
        collapsed
          ? ""
          : "lg:h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-0 lg:text-sm"
      } ${
        current
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <Icon className="size-5 shrink-0" />
      <span className={collapsed ? "" : "lg:flex-1"}>{item.label}</span>
      {badge !== null && (
        <span
          className={`absolute right-2 top-1 ${collapsed ? "" : "lg:static"}`}
        >
          <Count value={badge} />
        </span>
      )}
    </Link>
  );
}

function BottomLink({
  item,
  current,
  badge,
}: {
  item: NavItem;
  current: boolean;
  badge: number | null;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      // o contador fica antes do texto no visual; o nome acessível começa pelo item
      aria-label={
        badge !== null ? `${item.label} · ${badge} pendentes` : undefined
      }
      className={`relative flex flex-col items-center justify-center gap-0.5 text-xs font-medium ${
        current ? "text-zinc-900" : "text-zinc-500"
      }`}
    >
      {current && (
        <span
          aria-hidden
          className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-zinc-900"
        />
      )}
      <span className="relative">
        <Icon className="size-6" strokeWidth={current ? 2.4 : 2} />
        {badge !== null && (
          <span className="absolute -right-3.5 -top-2">
            <Count value={badge} />
          </span>
        )}
      </span>
      {item.label}
    </Link>
  );
}

/** Menu da conta (tablet/desktop): loja, ver cardápio e sair. */
function AccountMenu({
  tenant,
  leaving,
  onLogout,
}: {
  tenant: PanelTenant;
  leaving: boolean;
  onLogout: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        className="hidden size-11 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100 md:flex"
        aria-label="Conta"
      >
        <StoreBadge tenant={tenant} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 rounded-2xl p-2">
        <p className="truncate px-3 pb-2 pt-1 text-sm font-semibold text-zinc-900">
          {tenant.name}
        </p>
        <a
          href={`/${tenant.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          <ExternalLink className="size-4 text-zinc-500" />
          Ver meu cardápio
        </a>
        <button
          type="button"
          onClick={onLogout}
          disabled={leaving}
          className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          {leaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Sair
        </button>
      </PopoverContent>
    </Popover>
  );
}
