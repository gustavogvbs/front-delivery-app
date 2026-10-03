"use client";

import { isApiError } from "@/lib/http";
import { withWakeRetry } from "@/lib/wake";
import {
  getPanelOrder,
  getPanelTenant,
  getTab,
  listOrders,
  listTabs,
  clearOpenState,
  listPanelCategories,
  setOpenState,
} from "@/services/panel-api";
import type { PanelOrderSummary } from "@/types/panel";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** Intervalo da atualização automática da lista (pausa com a aba oculta). */
export const POLL_MS = 20_000;

export const panelKeys = {
  tenant: ["panel", "tenant"] as const,
  orders: ["panel", "orders"] as const,
  active: ["panel", "orders", "active"] as const,
  finished: ["panel", "orders", "finished"] as const,
  order: (id: string) => ["panel", "order", id] as const,
  catalog: ["panel", "categories"] as const,
  tabs: ["panel", "tabs"] as const,
  openTabs: ["panel", "tabs", "open"] as const,
  tabHistory: (from: string, to: string) =>
    ["panel", "tabs", "history", from, to] as const,
  tab: (id: string) => ["panel", "tabs", "detail", id] as const,
};

export function usePanelTenant() {
  return useQuery({
    queryKey: panelKeys.tenant,
    queryFn: () => withWakeRetry(getPanelTenant),
    staleTime: 60_000,
    // o estado aberto/fechado muda sozinho no modo automático
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

/** Pendentes no topo (o mais antigo primeiro: é quem espera há mais tempo). */
const byQueue = (a: PanelOrderSummary, b: PanelOrderSummary) =>
  a.createdAt.localeCompare(b.createdAt);

/**
 * Pedidos em andamento (PENDENTE + ACEITO). Atualiza sozinho a cada 20 s;
 * com a aba oculta o React Query pausa e, ao voltar, atualiza na hora.
 */
export function useActiveOrders() {
  return useQuery({
    queryKey: panelKeys.active,
    queryFn: () => withWakeRetry(() => listOrders(["PENDENTE", "ACEITO"], 100)),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
    select: (orders) => ({
      pending: orders.filter((o) => o.status === "PENDENTE").sort(byQueue),
      accepted: orders.filter((o) => o.status === "ACEITO").sort(byQueue),
    }),
  });
}

export function useFinishedOrders(enabled: boolean) {
  return useQuery({
    queryKey: panelKeys.finished,
    queryFn: () =>
      withWakeRetry(() =>
        listOrders(["CONCLUIDO", "RECUSADO", "CANCELADO"], 50),
      ),
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export function usePanelOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: panelKeys.order(id),
    queryFn: () => withWakeRetry(() => getPanelOrder(id)),
    enabled: enabled && id !== "",
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  });
}

/** Abre/fecha a loja (botão em destaque). */
export function useSetStoreOpen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { open: boolean; until?: string }) =>
      setOpenState(vars.open, vars.until),
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success(
        data.isOpen
          ? "Loja aberta: os clientes já podem pedir."
          : "Loja fechada: o cardápio continua visível, mas sem pedidos.",
      );
    },
    onError: (err) =>
      toast.error(
        isApiError(err) && err.status !== 0
          ? err.message
          : "Sem conexão com o servidor. Tente de novo.",
      ),
  });
}

/** "Voltar ao automático" (tira o ajuste temporário). */
export function useClearOpenOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearOpenState,
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success("A loja voltou a seguir os horários.");
    },
    onError: (err) =>
      toast.error(
        isApiError(err) && err.status !== 0
          ? err.message
          : "Sem conexão com o servidor. Tente de novo.",
      ),
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: panelKeys.catalog,
    queryFn: () => withWakeRetry(listPanelCategories),
    staleTime: 30_000,
    retry: false,
  });
}

/** Comandas abertas (aba Mesas e "Novo pedido"). Atualiza a cada 20 s. */
export function useOpenTabs(enabled = true) {
  return useQuery({
    queryKey: panelKeys.openTabs,
    queryFn: () => withWakeRetry(() => listTabs()),
    enabled,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });
}

/** Histórico (fechadas e canceladas) entre duas datas (AAAA-MM-DD, fuso da loja). */
export function useTabHistory(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: panelKeys.tabHistory(from, to),
    queryFn: () =>
      withWakeRetry(() => listTabs({ status: "FECHADA,CANCELADA", from, to })),
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export function useTab(id: string) {
  return useQuery({
    queryKey: panelKeys.tab(id),
    queryFn: () => withWakeRetry(() => getTab(id)),
    enabled: id !== "",
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  });
}
