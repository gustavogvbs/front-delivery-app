"use client";

import Link from "next/link";
import { useState } from "react";

import { formatBRL } from "@/lib/format";
import {
  ago,
  dateTimeShort,
  PAYMENT_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  timeHM,
} from "@/lib/panel-format";
import type { PanelOrderSummary } from "@/types/panel";
import { useIsFetching } from "@tanstack/react-query";
import { ChevronRight, Loader2, RefreshCw } from "lucide-react";

import {
  panelKeys,
  POLL_MS,
  useActiveOrders,
  useFinishedOrders,
} from "./use-panel";

type Tab = "andamento" | "finalizados";

export function OrdersBoard() {
  const [tab, setTab] = useState<Tab>("andamento");
  const active = useActiveOrders();
  const finished = useFinishedOrders(tab === "finalizados");
  const fetching = useIsFetching({ queryKey: panelKeys.orders }) > 0;

  const pending = active.data?.pending ?? [];
  const accepted = active.data?.accepted ?? [];
  const current = tab === "andamento" ? active : finished;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-4">
      <div
        role="tablist"
        className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-200/70 p-1"
      >
        {(
          [
            ["andamento", `Em andamento (${pending.length + accepted.length})`],
            ["finalizados", "Finalizados"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-11 rounded-lg text-sm font-semibold ${
              tab === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span aria-live="polite">
          {current.dataUpdatedAt
            ? `Atualizado às ${timeHM(new Date(current.dataUpdatedAt).toISOString())}`
            : "Carregando…"}
          {tab === "andamento" &&
            ` · atualiza sozinho a cada ${POLL_MS / 1000} s`}
        </span>
        <button
          type="button"
          onClick={() => current.refetch()}
          disabled={fetching}
          className="flex h-11 items-center gap-1 rounded-full px-3 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          {fetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Atualizar
        </button>
      </div>

      {current.isError && !current.data ? (
        <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-zinc-700">Não foi possível carregar os pedidos.</p>
          <button
            className="mt-3 h-11 rounded-xl bg-zinc-900 px-5 font-semibold text-white"
            onClick={() => current.refetch()}
          >
            Tentar de novo
          </button>
        </div>
      ) : current.isPending ? (
        <div className="mt-10 flex justify-center text-zinc-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : tab === "andamento" ? (
        pending.length + accepted.length === 0 ? (
          <Empty text="Nenhum pedido em andamento. Pedidos novos aparecem aqui sozinhos." />
        ) : (
          <>
            {pending.length > 0 && (
              <Section title={`Aguardando aceite (${pending.length})`}>
                {pending.map((o) => (
                  <OrderCard key={o.id} order={o} highlight />
                ))}
              </Section>
            )}
            {accepted.length > 0 && (
              <Section title={`Aceitos (${accepted.length})`}>
                {accepted.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </Section>
            )}
          </>
        )
      ) : (finished.data ?? []).length === 0 ? (
        <Empty text="Nenhum pedido finalizado ainda." />
      ) : (
        <Section title="Últimos 50">
          {(finished.data ?? []).map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </Section>
      )}
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-10 rounded-2xl bg-white p-6 text-center text-zinc-500 shadow-sm">
      {text}
    </p>
  );
}

function OrderCard({
  order,
  highlight,
}: {
  order: PanelOrderSummary;
  highlight?: boolean;
}) {
  const feePending = order.deliveryFeePending;
  return (
    <li>
      <Link
        href={`/painel/pedidos/${order.id}`}
        className={`flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm active:bg-zinc-50 ${
          highlight ? "border-2 border-amber-400 bg-amber-50/60" : ""
        }`}
        data-testid="order-card"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-zinc-900">
              #{order.number}
            </span>
            {highlight ? (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold uppercase text-amber-950">
                Novo
              </span>
            ) : (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[order.status]}`}
              >
                {STATUS_LABEL[order.status]}
              </span>
            )}
            <span className="text-xs text-zinc-500">
              {dateTimeShort(order.createdAt)} · {ago(order.createdAt)}
            </span>
          </div>
          <p className="mt-1 truncate font-medium text-zinc-800">
            {order.customerName}
          </p>
          <p className="text-sm text-zinc-600">
            {order.deliveryType === "ENTREGA" ? "Entrega" : "Retirada"} ·{" "}
            {PAYMENT_LABEL[order.paymentMethod]} · {order.itemsCount}{" "}
            {order.itemsCount === 1 ? "item" : "itens"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="block font-bold tabular-nums text-zinc-900">
            {formatBRL(order.totalCents)}
          </span>
          {feePending && (
            <span className="block text-xs text-amber-700">+ entrega</span>
          )}
        </div>
        <ChevronRight className="size-5 shrink-0 text-zinc-400" />
      </Link>
    </li>
  );
}
