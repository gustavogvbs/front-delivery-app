"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ConnectingBanner,
  FullPageMessage,
} from "@/components/common/connecting";
import { StoreAvatar, BrandScope } from "@/components/store/store-brand";
import {
  addLine,
  CartChange,
  CartLine,
  countOf,
  describeChange,
  loadCart,
  reconcileCart,
  saveCart,
  subtotalOf,
  takeStashedChanges,
} from "@/lib/cart";
import { deliveryTimeText, formatBRL } from "@/lib/format";
import { isApiError } from "@/lib/http";
import { pingHealth, withWakeRetry } from "@/lib/wake";
import { getMenu } from "@/services/public-api";
import type { Menu, MenuProduct } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bike, Clock, ShoppingBag, Store } from "lucide-react";

import { CartSheet } from "./cart-sheet";
import { ProductSheet } from "./product-sheet";

export function MenuView({ slug }: { slug: string }) {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    void pingHealth(); // acorda a API (cold start) o quanto antes
  }, []);

  const menuQuery = useQuery({
    queryKey: ["menu", slug],
    queryFn: () => withWakeRetry(() => getMenu(slug)),
    // o estado aberto/fechado pode mudar sozinho (horário automático)
    refetchInterval: 60_000,
    retry: false,
    staleTime: 30_000,
  });
  const menu = menuQuery.data;

  // ── carrinho (localStorage por loja) reconciliado com o cardápio ──
  const [lines, setLines] = useState<CartLine[]>([]);
  const [notice, setNotice] = useState<{
    message?: string;
    changes: CartChange[];
  } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState<MenuProduct | null>(null);

  useEffect(() => {
    if (!menu) return;
    const stashed = takeStashedChanges(slug); // vindo de um 409 no checkout
    const { lines: reconciled, changes } = reconcileCart(loadCart(slug), menu);
    saveCart(slug, reconciled);
    setLines(reconciled);
    const all = [...(stashed?.changes ?? []), ...changes];
    if (stashed || all.length)
      setNotice({ message: stashed?.message, changes: dedupe(all) });
    if (params.get("carrinho") === "1" && reconciled.length) setCartOpen(true);
  }, [menu, slug, params]);

  const updateLines = (next: CartLine[]) => {
    setLines(next);
    saveCart(slug, next);
  };

  if (menuQuery.isError) {
    const err = menuQuery.error;
    if (isApiError(err) && err.status === 404) {
      return (
        <FullPageMessage title="Loja não encontrada">
          <p className="text-zinc-500">Confira o link com o estabelecimento.</p>
        </FullPageMessage>
      );
    }
    return (
      <FullPageMessage title="Não foi possível carregar o cardápio">
        <p className="text-zinc-500">Verifique sua conexão e tente de novo.</p>
        <button
          className="mt-2 h-12 rounded-xl bg-zinc-900 px-6 font-semibold text-white"
          onClick={() => menuQuery.refetch()}
        >
          Tentar de novo
        </button>
      </FullPageMessage>
    );
  }

  if (!menu) {
    return (
      <>
        <ConnectingBanner />
        <MenuSkeleton />
      </>
    );
  }

  const count = countOf(lines);
  const subtotal = subtotalOf(lines);

  return (
    <BrandScope color={menu.primaryColor}>
      <ConnectingBanner />
      <main className="mx-auto max-w-md pb-32">
        <StoreHeader menu={menu} />

        {!menu.isOpen && (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-800"
          >
            <Store className="size-5 shrink-0" />
            <div>
              <p className="font-semibold" data-testid="closed-label">
                {/* manual: sem previsão; automático: "Fechado · abre hoje às 18:00" */}
                {menu.openStatus.source === "MANUAL"
                  ? "Fechado no momento"
                  : menu.openStatus.label}
              </p>
              <p className="text-sm">
                Você pode ver o cardápio, mas os pedidos estão pausados.
              </p>
            </div>
          </div>
        )}

        {notice && (
          <ChangesNotice notice={notice} onClose={() => setNotice(null)} />
        )}

        <CategoryChips menu={menu} />

        {menu.categories.map((cat) => (
          <section
            key={cat.id}
            id={`cat-${cat.slug}`}
            className="scroll-mt-20 px-4 pt-6"
          >
            <h2 className="mb-3 text-lg font-bold text-zinc-900">{cat.name}</h2>
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white shadow-sm">
              {cat.products.map((p) => (
                <li key={p.id}>
                  <ProductRow product={p} onSelect={() => setSelected(p)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {menu.categories.length === 0 && (
          <p className="px-4 pt-10 text-center text-zinc-500">
            Esta loja ainda não publicou o cardápio.
          </p>
        )}

        <footer className="px-4 pt-10 text-center text-xs text-zinc-400">
          <a href="/privacidade" className="underline">
            Política de privacidade
          </a>
        </footer>
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
          <button
            onClick={() => setCartOpen(true)}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-brand px-5 text-white shadow-lg"
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingBag className="size-5" />
              Ver carrinho ({count})
            </span>
            <span className="font-bold tabular-nums">
              {formatBRL(subtotal)}
            </span>
          </button>
        </div>
      )}

      <ProductSheet
        product={selected}
        canOrder={menu.isOpen}
        onClose={() => setSelected(null)}
        onAdd={(product, qty, notes) => {
          updateLines(addLine(lines, product, qty, notes));
          setSelected(null);
        }}
      />
      <CartSheet
        notice={
          notice ? (
            <ChangesNotice notice={notice} onClose={() => setNotice(null)} />
          ) : null
        }
        open={cartOpen}
        onOpenChange={setCartOpen}
        menu={menu}
        lines={lines}
        onChange={updateLines}
        onCheckout={() => router.push(`/${slug}/checkout`)}
      />
    </BrandScope>
  );
}

function dedupe(changes: CartChange[]) {
  const seen = new Set<string>();
  return changes.filter((c) => {
    const k = `${c.type}:${c.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function StoreHeader({ menu }: { menu: Menu }) {
  const time = deliveryTimeText(menu.deliveryTime);
  return (
    <header className="bg-white px-4 pb-4 pt-6 shadow-sm">
      <div className="flex items-center gap-4">
        <StoreAvatar
          logo={menu.logo}
          initials={menu.initials}
          name={menu.name}
        />
        <div className="min-w-0">
          <h1 className="truncate font-title text-2xl text-zinc-900">
            {menu.name}
          </h1>
          <p className="text-sm text-zinc-500">{menu.city}</p>
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
              menu.isOpen
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {menu.openStatus.label}
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
        {time && menu.acceptsDelivery && (
          <span className="flex items-center gap-1">
            <Clock className="size-4" /> {time}
          </span>
        )}
        {menu.acceptsDelivery && (
          <span className="flex items-center gap-1">
            <Bike className="size-4" /> Entrega
          </span>
        )}
        {menu.acceptsPickup && (
          <span className="flex items-center gap-1">
            <Store className="size-4" /> Retirada
          </span>
        )}
        {menu.minOrderCents !== null && (
          <span>Pedido mínimo {formatBRL(menu.minOrderCents)}</span>
        )}
      </div>
    </header>
  );
}

function CategoryChips({ menu }: { menu: Menu }) {
  if (menu.categories.length < 2) return null;
  return (
    <nav
      aria-label="Categorias"
      className="sticky top-0 z-30 -mb-2 flex gap-2 overflow-x-auto bg-zinc-50/95 px-4 py-3 backdrop-blur scrollbar-hide"
    >
      {menu.categories.map((c) => (
        <a
          key={c.id}
          href={`#cat-${c.slug}`}
          className="flex h-10 shrink-0 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700"
        >
          {c.name}
        </a>
      ))}
    </nav>
  );
}

function ProductRow({
  product,
  onSelect,
}: {
  product: MenuProduct;
  onSelect: () => void;
}) {
  const off = !product.isAvailable;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={off}
      className="flex w-full items-center gap-3 p-4 text-left disabled:cursor-not-allowed"
    >
      <div className={`min-w-0 flex-1 ${off ? "opacity-50" : ""}`}>
        <p className="font-semibold text-zinc-900">{product.name}</p>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">
            {product.description}
          </p>
        )}
        <p className="mt-1 font-semibold text-zinc-900">
          {off ? (
            <span className="text-sm text-red-700">Indisponível</span>
          ) : (
            formatBRL(product.priceCents)
          )}
        </p>
      </div>
      {product.image && (
        <Image
          src={product.image.url}
          alt={product.image.alt || product.name}
          width={88}
          height={88}
          className={`size-[88px] shrink-0 rounded-xl object-cover ${off ? "grayscale" : ""}`}
          style={{ width: 88, height: 88 }}
          loading="lazy"
        />
      )}
    </button>
  );
}

function ChangesNotice({
  notice,
  onClose,
}: {
  notice: { message?: string; changes: CartChange[] };
  onClose: () => void;
}) {
  const extra = notice.changes.filter(
    (c) => !(notice.message && notice.message.includes(c.name)),
  );
  return (
    <div
      role="alert"
      className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-semibold">
            {notice.message ?? "Seu carrinho foi atualizado"}
          </p>
          {/* itens já citados na mensagem do back não se repetem na lista */}
          {extra.length > 0 && (
            <ul className="mt-1 list-disc pl-4">
              {extra.map((c, i) => (
                <li key={i}>{describeChange(c)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        className="mt-2 h-10 w-full rounded-lg text-sm font-semibold underline"
      >
        Entendi
      </button>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <main
      className="mx-auto max-w-md animate-pulse px-4 pt-6"
      aria-busy="true"
      aria-label="Carregando cardápio"
    >
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-2xl bg-zinc-200" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-zinc-200" />
          <div className="h-4 w-24 rounded bg-zinc-200" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-8 space-y-3">
          <div className="h-5 w-32 rounded bg-zinc-200" />
          <div className="h-20 rounded-2xl bg-zinc-200" />
          <div className="h-20 rounded-2xl bg-zinc-200" />
        </div>
      ))}
    </main>
  );
}
