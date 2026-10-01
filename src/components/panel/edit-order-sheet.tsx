"use client";

import { useEffect, useRef, useState } from "react";

import { Stepper } from "@/components/common/stepper";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatBRL, maskMoney } from "@/lib/format";
import { isApiError } from "@/lib/http";
import { PAYMENT_LABEL } from "@/lib/panel-format";
import { withWakeRetry } from "@/lib/wake";
import { editOrder, listPanelCategories } from "@/services/panel-api";
import type { PaymentMethod } from "@/types/api";
import type { EditOrderBody, PanelOrder } from "@/types/panel";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Line {
  key: string;
  itemId?: string;
  productId?: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PanelOrder;
  onSaved: (order: PanelOrder) => void;
  onConflict: () => void;
}

const fromOrder = (order: PanelOrder): Line[] =>
  order.items.map((i) => ({
    key: i.id,
    itemId: i.id,
    name: i.productName,
    unitPriceCents: i.unitPriceCents,
    quantity: i.quantity,
    notes: i.notes ?? "",
  }));

const moneyText = (cents: number | null) =>
  cents === null ? "" : formatBRL(cents);

/**
 * Edição do pedido (PENDENTE/ACEITO): itens e quantidades, observações,
 * taxa de entrega e pagamento. Nenhum total é calculado aqui: o back
 * recalcula e a tela mostra o que ele devolver.
 */
export function EditOrderSheet({ open, onOpenChange, ...rest }: Props) {
  // enquanto salva, a folha não fecha (nem por toque fora nem por Esc)
  const [locked, setLocked] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!locked) onOpenChange(o);
      }}
    >
      <SheetContent
        title={`Editar pedido #${rest.order.number}`}
        description="O total é recalculado pela loja ao salvar."
      >
        {/* o conteúdo monta a cada abertura: o formulário começa do pedido atual */}
        <EditForm
          {...rest}
          onClose={() => onOpenChange(false)}
          onPendingChange={setLocked}
        />
      </SheetContent>
    </Sheet>
  );
}

function EditForm({
  order,
  onSaved,
  onConflict,
  onClose,
  onPendingChange,
}: Omit<Props, "open" | "onOpenChange"> & {
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [lines, setLines] = useState<Line[]>(() => fromOrder(order));
  const [notes, setNotes] = useState(order.notes ?? "");
  const [fee, setFee] = useState(moneyText(order.deliveryFeeCents));
  const [payment, setPayment] = useState<PaymentMethod>(order.paymentMethod);
  const [change, setChange] = useState(moneyText(order.changeForCents));
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const catalog = useQuery({
    queryKey: ["panel", "categories"],
    queryFn: () => withWakeRetry(listPanelCategories),
    enabled: adding,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (body: EditOrderBody) => editOrder(order.id, body),
    onSuccess: onSaved,
    onError: (err) => {
      if (isApiError(err) && err.status === 409) {
        toast.error(err.message);
        onConflict();
        return;
      }
      setError(
        isApiError(err) && err.status !== 0
          ? err.message
          : "Sem conexão com o servidor. Tente de novo.",
      );
    },
    onSettled: () => {
      busy.current = false;
    },
  });

  useEffect(() => {
    onPendingChange(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  const delivery = order.deliveryType === "ENTREGA";

  const setQty = (key: string, quantity: number) =>
    setLines((ls) =>
      quantity <= 0
        ? ls.filter((l) => l.key !== key)
        : ls.map((l) => (l.key === key ? { ...l, quantity } : l)),
    );

  const addProduct = (p: { id: string; name: string; priceCents: number }) => {
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id && !l.notes);
      if (existing)
        return ls.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l,
        );
      return [
        ...ls,
        {
          key: `new-${p.id}-${Date.now()}`,
          productId: p.id,
          name: p.name,
          unitPriceCents: p.priceCents,
          quantity: 1,
          notes: "",
        },
      ];
    });
    setAdding(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    setError(null);
    if (lines.length === 0) {
      setError("O pedido precisa de pelo menos um item.");
      return;
    }
    const body: EditOrderBody = {
      items: lines.map((l) =>
        l.itemId
          ? { itemId: l.itemId, quantity: l.quantity, notes: l.notes || null }
          : {
              productId: l.productId!,
              quantity: l.quantity,
              notes: l.notes || null,
            },
      ),
      notes: notes.trim() || null,
      paymentMethod: payment,
      changeForCents: payment === "DINHEIRO" ? maskMoney(change).cents : null,
    };
    // taxa: só em entrega; vazio mantém como está (inclusive "a combinar")
    const feeCents = maskMoney(fee).cents;
    if (delivery && fee.trim() !== "") body.deliveryFeeCents = feeCents ?? 0;
    busy.current = true;
    mutation.mutate(body);
  };

  return (
    <form onSubmit={submit} className="space-y-5 p-4">
      <section>
        <h3 className="mb-2 font-semibold text-zinc-900">Itens</h3>
        <ul className="divide-y divide-zinc-100">
          {lines.map((l) => (
            <li key={l.key} className="space-y-2 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">{l.name}</p>
                  <p className="text-sm text-zinc-500">
                    {formatBRL(l.unitPriceCents)} cada
                    {l.productId ? " · novo" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQty(l.key, 0)}
                  disabled={lines.length === 1}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-red-600 disabled:text-zinc-300"
                  aria-label={`Remover ${l.name}`}
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Stepper
                  value={l.quantity}
                  onChange={(q) => setQty(l.key, q)}
                  label={`Quantidade de ${l.name}`}
                />
                <input
                  value={l.notes}
                  onChange={(e) =>
                    setLines((ls) =>
                      ls.map((x) =>
                        x.key === l.key
                          ? { ...x, notes: e.target.value.slice(0, 200) }
                          : x,
                      ),
                    )
                  }
                  placeholder="Obs. do item"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 text-base"
                  aria-label={`Observação de ${l.name}`}
                />
              </div>
            </li>
          ))}
        </ul>

        {adding ? (
          <div className="mt-2 rounded-xl border border-zinc-200 p-2">
            {catalog.isPending ? (
              <Loader2 className="mx-auto my-3 size-5 animate-spin text-zinc-400" />
            ) : catalog.isError ? (
              <p className="p-2 text-sm text-red-700">
                Não foi possível carregar o cardápio.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {(catalog.data ?? []).map((c) => {
                  const available = c.products.filter((p) => p.isAvailable);
                  if (!available.length) return null;
                  return (
                    <div key={c.id} className="py-1">
                      <p className="px-2 text-xs font-semibold uppercase text-zinc-500">
                        {c.name}
                      </p>
                      {available.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left hover:bg-zinc-50"
                        >
                          <span>{p.name}</span>
                          <span className="text-sm tabular-nums text-zinc-500">
                            {formatBRL(p.priceCents)}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="mt-1 h-11 w-full text-sm font-medium text-zinc-600"
            >
              Fechar lista
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-400 text-sm font-semibold text-zinc-700"
          >
            <Plus className="size-4" />
            Adicionar item
          </button>
        )}
      </section>

      <label className="block">
        <span className="font-semibold text-zinc-900">
          Observação do pedido
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          rows={2}
          className="mt-1 w-full rounded-xl border border-zinc-300 p-3 text-base"
        />
      </label>

      {delivery && (
        <label className="block">
          <span className="font-semibold text-zinc-900">Taxa de entrega</span>
          <input
            inputMode="numeric"
            value={fee}
            onChange={(e) => setFee(maskMoney(e.target.value).text)}
            placeholder={
              order.deliveryFeeCents === null ? "A combinar" : "R$ 0,00"
            }
            className="mt-1 h-12 w-full rounded-xl border border-zinc-300 px-3 text-base tabular-nums"
          />
          {order.deliveryFeeCents === null && (
            <span className="mt-1 block text-xs text-zinc-500">
              O cliente não marcou o local no mapa. Informe a taxa combinada.
            </span>
          )}
        </label>
      )}

      <fieldset>
        <legend className="font-semibold text-zinc-900">Pagamento</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["PIX", "DINHEIRO", "CARTAO"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={payment === m}
              onClick={() => setPayment(m)}
              className={`h-11 rounded-xl border text-sm font-semibold ${
                payment === m
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 text-zinc-700"
              }`}
            >
              {m === "CARTAO" ? "Cartão" : PAYMENT_LABEL[m]}
            </button>
          ))}
        </div>
        {payment === "DINHEIRO" && (
          <label className="mt-3 block">
            <span className="text-sm text-zinc-700">Troco para (opcional)</span>
            <input
              inputMode="numeric"
              value={change}
              onChange={(e) => setChange(maskMoney(e.target.value).text)}
              placeholder="Sem troco"
              className="mt-1 h-12 w-full rounded-xl border border-zinc-300 px-3 text-base tabular-nums"
            />
          </label>
        )}
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className="h-12 rounded-xl border border-zinc-300 font-semibold text-zinc-700 disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </button>
      </div>
    </form>
  );
}
