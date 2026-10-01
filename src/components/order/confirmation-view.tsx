"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ConnectingBanner,
  FullPageMessage,
} from "@/components/common/connecting";
import { BrandScope } from "@/components/store/store-brand";
import {
  cachedOrder,
  markWhatsappOpened,
  whatsappAlreadyOpened,
} from "@/lib/checkout-session";
import { formatBRL, formatKm } from "@/lib/format";
import { isApiError } from "@/lib/http";
import { withWakeRetry } from "@/lib/wake";
import { getOrder } from "@/services/public-api";
import type { OrderConfirmation } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Copy, MessageCircle } from "lucide-react";

const STATUS: Record<OrderConfirmation["status"], string> = {
  PENDENTE: "Aguardando a loja",
  ACEITO: "Aceito pela loja",
  RECUSADO: "Recusado pela loja",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
};

const PAYMENT: Record<OrderConfirmation["paymentMethod"], string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão (maquininha)",
};

export function ConfirmationView({ id }: { id: string }) {
  const params = useSearchParams();
  const [initial] = useState<OrderConfirmation | null>(() => cachedOrder(id));

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => withWakeRetry(() => getOrder(id)),
    initialData: initial ?? undefined,
    retry: false,
  });
  // Totais SEMPRE vindos do back (resposta do POST ou GET /orders/:id)
  const order = query.data;

  // Abre o WhatsApp uma única vez logo após o envio (?enviar=1)
  useEffect(() => {
    if (!order || params.get("enviar") !== "1") return;
    window.history.replaceState(null, "", window.location.pathname);
    if (whatsappAlreadyOpened(order.id)) return;
    markWhatsappOpened(order.id);
    window.location.href = order.whatsappUrl;
  }, [order, params]);

  if (!order) {
    if (query.isError) {
      const notFound = isApiError(query.error) && query.error.status === 404;
      return (
        <FullPageMessage
          title={
            notFound
              ? "Pedido não encontrado"
              : "Não foi possível carregar o pedido"
          }
        >
          {!notFound && (
            <button
              className="h-12 rounded-xl bg-zinc-900 px-6 font-semibold text-white"
              onClick={() => query.refetch()}
            >
              Tentar de novo
            </button>
          )}
        </FullPageMessage>
      );
    }
    return (
      <>
        <ConnectingBanner />
        <FullPageMessage title="Carregando pedido…" />
      </>
    );
  }

  const pickup = order.deliveryType === "RETIRADA";

  return (
    <BrandScope color={order.store.primaryColor}>
      <ConnectingBanner />
      <main className="mx-auto max-w-md space-y-4 px-4 pb-40 pt-8">
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-14 text-brand" />
          <h1 className="mt-3 text-2xl font-bold text-zinc-900">
            Pedido #{order.number} registrado
          </h1>
          <p className="mt-1 text-zinc-600">{order.store.name}</p>
          <span className="mt-2 inline-block rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700">
            {STATUS[order.status]}
          </span>
        </div>

        <div className="rounded-2xl border-2 border-brand bg-white p-4">
          <p className="font-semibold text-zinc-900">
            Falta só um passo: envie o pedido pelo WhatsApp
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            A loja recebe o pedido pelo WhatsApp. Se o aplicativo não abriu,
            toque no botão abaixo.
          </p>
        </div>

        {order.pixKey && <PixKey pixKey={order.pixKey} />}
        {order.paymentMethod === "PIX" && !order.pixKey && (
          <p className="rounded-2xl bg-white p-4 text-sm text-zinc-600 shadow-sm">
            A loja vai enviar a chave Pix pelo WhatsApp.
          </p>
        )}

        <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Resumo</h2>
          <ul className="space-y-1 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-zinc-700">
                  {i.quantity}x {i.productName}
                  {i.notes ? (
                    <span className="block text-xs text-zinc-400">
                      Obs.: {i.notes}
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums">{formatBRL(i.totalCents)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t pt-2 text-sm text-zinc-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatBRL(order.subtotalCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>
                {pickup ? "Retirada" : "Entrega"}
                {!pickup && order.distanceMeters !== null
                  ? ` (${formatKm(order.distanceMeters)})`
                  : ""}
              </span>
              <span className="tabular-nums">
                {pickup
                  ? "Grátis"
                  : order.deliveryFeeCents === null
                    ? "A combinar"
                    : formatBRL(order.deliveryFeeCents)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-zinc-900">
              <span>Total</span>
              <span className="tabular-nums">
                {formatBRL(order.totalCents)}
                {!pickup && order.deliveryFeeCents === null ? " + entrega" : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pagamento</span>
              <span>
                {PAYMENT[order.paymentMethod]}
                {order.changeForCents
                  ? ` • troco para ${formatBRL(order.changeForCents)}`
                  : ""}
              </span>
            </div>
          </div>
        </section>

        <Link
          href={`/${order.store.slug}`}
          className="block py-3 text-center text-sm font-semibold text-zinc-600 underline"
        >
          Voltar ao cardápio
        </Link>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {/* link comum (não window.open): funciona mesmo com bloqueio de pop-up */}
        <a
          href={order.whatsappUrl}
          onClick={() => markWhatsappOpened(order.id)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-base font-semibold text-white"
        >
          <MessageCircle className="size-5" />
          Enviar pelo WhatsApp
        </a>
      </div>
    </BrandScope>
  );
}

function PixKey({ pixKey }: { pixKey: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false); // sem permissão de clipboard: o cliente copia manualmente
    }
  };
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-zinc-900">Chave Pix da loja</h2>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 select-all break-all rounded-lg bg-zinc-100 px-3 py-3 text-sm">
          {pixKey}
        </code>
        <button
          type="button"
          onClick={copy}
          className="flex h-12 shrink-0 items-center gap-1 rounded-xl border border-zinc-300 px-3 text-sm font-semibold"
          aria-live="polite"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copiada" : "Copiar"}
        </button>
      </div>
    </section>
  );
}
