"use client";

import { withWakeRetry } from "@/lib/wake";
import {
  getPanelOrder,
  getPanelTenant,
  listOrders,
} from "@/services/panel-api";
import type { PanelOrderSummary } from "@/types/panel";
import { useQuery } from "@tanstack/react-query";

/** Intervalo da atualização automática da lista (pausa com a aba oculta). */
export const POLL_MS = 20_000;

export const panelKeys = {
  tenant: ["panel", "tenant"] as const,
  orders: ["panel", "orders"] as const,
  active: ["panel", "orders", "active"] as const,
  finished: ["panel", "orders", "finished"] as const,
  order: (id: string) => ["panel", "order", id] as const,
};

export function usePanelTenant() {
  return useQuery({
    queryKey: panelKeys.tenant,
    queryFn: () => withWakeRetry(getPanelTenant),
    staleTime: 60_000,
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

export function usePanelOrder(id: string) {
  return useQuery({
    queryKey: panelKeys.order(id),
    queryFn: () => withWakeRetry(() => getPanelOrder(id)),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  });
}
