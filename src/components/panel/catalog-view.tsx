"use client";

import { useRef, useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { splitFieldError } from "@/lib/api-errors";
import { formatBRL, maskMoney, onlyDigits } from "@/lib/format";
import { isApiError } from "@/lib/http";
import {
  ACCEPTED_IMAGES,
  prepareImage,
  uploadErrorText,
} from "@/lib/image-upload";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  removeProductImage,
  updateCategory,
  updateProduct,
  uploadProductImage,
} from "@/services/panel-api";
import type { PanelCategory, PanelProduct } from "@/types/panel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ImageIcon,
  ImageUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Field, inputClass } from "./settings-view";
import { panelKeys, useCatalog } from "./use-panel";

type ProductSheetState =
  | { mode: "create"; categoryId: string }
  | { mode: "edit"; product: PanelProduct }
  | null;

type CategorySheetState =
  | { mode: "create" }
  | { mode: "edit"; category: PanelCategory }
  | null;

const errorText = (err: unknown) => splitFieldError(err).message;

/** Tela "Cardápio": categorias e produtos (foto, preço, disponível, ordem). */
export function CatalogView() {
  const catalog = useCatalog();
  const [productSheet, setProductSheet] = useState<ProductSheetState>(null);
  const [categorySheet, setCategorySheet] = useState<CategorySheetState>(null);

  if (!catalog.data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        {catalog.isError ? (
          <button
            className="h-11 rounded-xl bg-zinc-900 px-5 font-semibold text-white"
            onClick={() => catalog.refetch()}
          >
            Tentar de novo
          </button>
        ) : (
          <Loader2 className="mx-auto size-6 animate-spin text-zinc-400" />
        )}
      </main>
    );
  }
  const categories = catalog.data;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">
          {categories.length === 0
            ? "Comece criando uma categoria (ex.: Lanches, Bebidas)."
            : "Toque no produto para editar. O botão ao lado liga e desliga a disponibilidade."}
        </p>
        <button
          type="button"
          onClick={() => setCategorySheet({ mode: "create" })}
          className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />
          Categoria
        </button>
      </div>

      {categories.map((c) => (
        <section
          key={c.id}
          className="rounded-2xl bg-white shadow-sm"
          data-testid="category"
        >
          <header className="flex items-center gap-2 border-b px-4 py-2">
            <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-zinc-900">
              {c.name}
            </h2>
            <button
              type="button"
              onClick={() => setCategorySheet({ mode: "edit", category: c })}
              className="flex size-11 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
              aria-label={`Editar categoria ${c.name}`}
            >
              <Pencil className="size-4" />
            </button>
          </header>
          {c.products.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">
              Nenhum produto. Categorias vazias não aparecem no cardápio.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {c.products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onEdit={() => setProductSheet({ mode: "edit", product: p })}
                />
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() =>
              setProductSheet({ mode: "create", categoryId: c.id })
            }
            className="flex h-12 w-full items-center justify-center gap-2 border-t text-sm font-semibold text-zinc-700"
          >
            <Plus className="size-4" />
            Produto em {c.name}
          </button>
        </section>
      ))}

      <Sheet
        open={productSheet !== null}
        onOpenChange={(o) => !o && setProductSheet(null)}
      >
        {productSheet && (
          <SheetContent
            title={
              productSheet.mode === "create" ? "Novo produto" : "Editar produto"
            }
          >
            <ProductForm
              state={productSheet}
              categories={categories}
              onDone={() => setProductSheet(null)}
            />
          </SheetContent>
        )}
      </Sheet>

      <Sheet
        open={categorySheet !== null}
        onOpenChange={(o) => !o && setCategorySheet(null)}
      >
        {categorySheet && (
          <SheetContent
            title={
              categorySheet.mode === "create"
                ? "Nova categoria"
                : "Editar categoria"
            }
          >
            <CategoryForm
              state={categorySheet}
              onDone={() => setCategorySheet(null)}
            />
          </SheetContent>
        )}
      </Sheet>
    </main>
  );
}

/** Troca o produto na lista em cache (sem refazer o GET). */
function useReplaceProduct() {
  const qc = useQueryClient();
  return (product: PanelProduct) =>
    qc.setQueryData<PanelCategory[]>(panelKeys.catalog, (cats) =>
      cats?.map((c) => ({
        ...c,
        products: c.products.map((p) => (p.id === product.id ? product : p)),
      })),
    );
}

function ProductRow({
  product,
  onEdit,
}: {
  product: PanelProduct;
  onEdit: () => void;
}) {
  const replace = useReplaceProduct();
  const toggle = useMutation({
    mutationFn: () =>
      updateProduct(product.id, { isAvailable: !product.isAvailable }),
    onSuccess: (p) => {
      replace(p);
      toast.success(
        p.isAvailable
          ? `"${p.name}" disponível.`
          : `"${p.name}" indisponível: aparece no cardápio sem poder pedir.`,
      );
    },
    onError: (err) => toast.error(errorText(err)),
  });

  return (
    <li className="flex items-center gap-3 px-4 py-2" data-testid="product-row">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left"
      >
        {product.image ? (
          <img
            src={product.image.url}
            alt=""
            className="size-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
            <ImageIcon className="size-5" />
          </span>
        )}
        <span className="min-w-0">
          <span
            className={`block truncate font-medium ${product.isAvailable ? "text-zinc-900" : "text-zinc-400 line-through"}`}
          >
            {product.name}
          </span>
          <span className="block text-sm tabular-nums text-zinc-600">
            {formatBRL(product.priceCents)}
          </span>
        </span>
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={product.isAvailable}
        aria-label={`${product.name} disponível`}
        onClick={() => toggle.mutate()}
        disabled={toggle.isPending}
        className="flex h-11 shrink-0 items-center gap-2 rounded-full pl-1 pr-1 disabled:opacity-60"
      >
        <span
          className={`relative h-7 w-12 rounded-full transition-colors ${product.isAvailable ? "bg-emerald-500" : "bg-zinc-300"}`}
        >
          <span
            className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${product.isAvailable ? "left-[22px]" : "left-0.5"}`}
          />
        </span>
      </button>
    </li>
  );
}

function ProductForm({
  state,
  categories,
  onDone,
}: {
  state: NonNullable<ProductSheetState>;
  categories: PanelCategory[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const replace = useReplaceProduct();
  const editing = state.mode === "edit" ? state.product : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [price, setPrice] = useState(
    editing ? formatBRL(editing.priceCents) : "",
  );
  const [categoryId, setCategoryId] = useState(
    editing?.categoryId ??
      (state.mode === "create" ? state.categoryId : categories[0]?.id),
  );
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 0));
  const [available, setAvailable] = useState(editing?.isAvailable ?? true);
  // criação: a foto vai junto no POST; edição: troca na hora
  const [newImage, setNewImage] = useState<{ blob: Blob; url: string } | null>(
    null,
  );
  const [image, setImage] = useState(editing?.image ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: panelKeys.catalog });

  const save = useMutation({
    mutationFn: async () => {
      const input = {
        name: name.trim(),
        description: description.trim() || null,
        priceCents: maskMoney(price).cents ?? 0,
        categoryId,
        isAvailable: available,
        sortOrder: Number(sortOrder || 0),
      };
      return editing
        ? updateProduct(editing.id, input)
        : createProduct(input, newImage?.blob);
    },
    onSuccess: (p) => {
      toast.success(editing ? "Produto salvo." : `"${p.name}" criado.`);
      void refresh();
      onDone();
    },
    onError: (err) => {
      const { field, message } = splitFieldError(err);
      setErrors({ [field ?? "form"]: message });
    },
  });

  const photo = useMutation({
    mutationFn: async (action: { file: File } | "remove") => {
      if (action === "remove") return removeProductImage(editing!.id);
      return uploadProductImage(editing!.id, await prepareImage(action.file));
    },
    onSuccess: (p) => {
      setImage(p.image);
      replace(p);
      toast.success(p.image ? "Foto atualizada." : "Foto removida.");
    },
    onError: (err) =>
      setErrors({
        image: isApiError(err) ? uploadErrorText(err) : "Erro inesperado.",
      }),
  });

  const remove = useMutation({
    mutationFn: () => deleteProduct(editing!.id),
    onSuccess: () => {
      toast.success("Produto excluído.");
      void refresh();
      onDone();
    },
    onError: (err) => setErrors({ form: errorText(err) }),
  });

  const busy = save.isPending || photo.isPending || remove.isPending;

  const pickFile = async (file: File) => {
    setErrors({});
    if (editing) {
      photo.mutate({ file });
      return;
    }
    const blob = await prepareImage(file);
    if (newImage) URL.revokeObjectURL(newImage.url);
    setNewImage({ blob, url: URL.createObjectURL(blob) });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Informe o nome do produto.";
    if (maskMoney(price).cents === null) errs.priceCents = "Informe o preço.";
    if (!categoryId) errs.categoryId = "Escolha a categoria.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    save.mutate();
  };

  const previewUrl = newImage?.url ?? image?.url ?? null;

  return (
    <form onSubmit={submit} className="space-y-4 p-4" noValidate>
      <div className="flex items-center gap-4">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="size-24 shrink-0 rounded-2xl object-cover"
            data-testid="product-photo"
          />
        ) : (
          <span className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
            <ImageIcon className="size-7" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-800 disabled:opacity-60"
          >
            {photo.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImageUp className="size-4" />
            )}
            {photo.isPending
              ? "Enviando…"
              : previewUrl
                ? "Trocar foto"
                : "Escolher foto"}
          </button>
          {editing && image && (
            <button
              type="button"
              onClick={() => photo.mutate("remove")}
              disabled={busy}
              className="h-11 rounded-xl text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              Remover foto
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_IMAGES}
          className="hidden"
          data-testid="product-photo-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void pickFile(file);
          }}
        />
      </div>
      {errors.image && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {errors.image}
        </p>
      )}

      <Field label="Nome" error={errors.name}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          className={inputClass}
        />
      </Field>
      <Field label="Descrição (opcional)" error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={2}
          className="w-full rounded-xl border border-zinc-300 p-3 text-base outline-none focus:border-zinc-900"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço" error={errors.priceCents}>
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(maskMoney(e.target.value).text)}
            placeholder="R$ 0,00"
            className={inputClass}
          />
        </Field>
        <Field
          label="Ordem"
          hint="Menor aparece antes."
          error={errors.sortOrder}
        >
          <input
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(onlyDigits(e.target.value).slice(0, 5))
            }
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Categoria" error={errors.categoryId}>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-300 px-3">
        <span className="text-base text-zinc-800">Disponível para pedir</span>
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
          className="size-6 accent-zinc-900"
        />
      </label>

      {errors.form && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {errors.form}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
      >
        {save.isPending && <Loader2 className="size-5 animate-spin" />}
        {editing ? "Salvar produto" : "Criar produto"}
      </button>

      {editing &&
        (confirmDelete ? (
          <div className="space-y-2 rounded-xl bg-red-50 p-3">
            <p className="text-sm text-red-900">
              Excluir “{editing.name}”? Pedidos antigos continuam com o nome e o
              preço da época.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="h-11 rounded-xl border border-zinc-300 bg-white font-semibold text-zinc-700"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => remove.mutate()}
                disabled={busy}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white disabled:opacity-60"
              >
                {remove.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-red-700"
          >
            <Trash2 className="size-4" />
            Excluir produto
          </button>
        ))}
    </form>
  );
}

function CategoryForm({
  state,
  onDone,
}: {
  state: NonNullable<CategorySheetState>;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const editing = state.mode === "edit" ? state.category : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const done = (message: string) => {
    toast.success(message);
    void qc.invalidateQueries({ queryKey: panelKeys.catalog });
    onDone();
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), sortOrder: Number(sortOrder || 0) };
      return editing ? updateCategory(editing.id, body) : createCategory(body);
    },
    onSuccess: (c) =>
      done(editing ? "Categoria salva." : `"${c.name}" criada.`),
    onError: (err) => setError(errorText(err)),
  });
  const remove = useMutation({
    mutationFn: () => deleteCategory(editing!.id),
    onSuccess: () => done("Categoria excluída."),
    onError: (err) => {
      setConfirmDelete(false);
      setError(errorText(err));
    },
  });
  const busy = save.isPending || remove.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        if (!name.trim()) {
          setError("Informe o nome da categoria.");
          return;
        }
        setError(null);
        save.mutate();
      }}
      className="space-y-4 p-4"
      noValidate
    >
      <Field label="Nome">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Ex.: Lanches"
          className={inputClass}
        />
      </Field>
      <Field label="Ordem" hint="Menor aparece antes no cardápio.">
        <input
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(onlyDigits(e.target.value).slice(0, 5))}
          className={inputClass}
        />
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
      >
        {save.isPending && <Loader2 className="size-5 animate-spin" />}
        {editing ? "Salvar categoria" : "Criar categoria"}
      </button>
      {editing &&
        (confirmDelete ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className="h-11 rounded-xl border border-zinc-300 font-semibold text-zinc-700"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={busy}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white disabled:opacity-60"
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar exclusão
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-red-700"
          >
            <Trash2 className="size-4" />
            Excluir categoria
          </button>
        ))}
    </form>
  );
}
