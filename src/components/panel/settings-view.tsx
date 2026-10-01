"use client";

import { useRef, useState } from "react";

import { splitFieldError } from "@/lib/api-errors";
import { formatBRL, maskMoney, maskPhone, onlyDigits } from "@/lib/format";
import { isApiError } from "@/lib/http";
import {
  ACCEPTED_IMAGES,
  prepareImage,
  uploadErrorText,
} from "@/lib/image-upload";
import {
  changePassword,
  removeLogo,
  updateSettings,
  uploadLogo,
} from "@/services/panel-api";
import type { PanelTenant, SettingsPatch } from "@/types/panel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, EyeOff, ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { panelKeys, usePanelTenant, useSetStoreOpen } from "./use-panel";

/** Tela "Loja": aberto/fechado, logo, dados e senha. */
export function SettingsView() {
  const tenant = usePanelTenant();
  if (!tenant.data) {
    return (
      <main className="flex justify-center py-10 text-zinc-400">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-4">
      <OpenCard tenant={tenant.data} />
      <LogoCard tenant={tenant.data} />
      {/* key: reinicia o formulário quando os dados salvos mudam por outra tela */}
      <DataForm
        key={tenant.data.name + tenant.data.whatsapp}
        tenant={tenant.data}
      />
      <PasswordForm />
    </main>
  );
}

export function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  // dica e erro fora do <label>: o nome acessível do campo fica só o rótulo
  return (
    <div>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        <div className="mt-1">{children}</div>
      </label>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none focus:border-zinc-900";

function OpenCard({ tenant }: { tenant: PanelTenant }) {
  const setOpen = useSetStoreOpen();
  return (
    <section
      className={`rounded-2xl border-2 p-4 ${
        tenant.isOpen
          ? "border-emerald-500 bg-emerald-50"
          : "border-red-400 bg-red-50"
      }`}
    >
      <p
        className={`text-lg font-bold ${tenant.isOpen ? "text-emerald-900" : "text-red-900"}`}
        data-testid="store-open-state"
      >
        {tenant.isOpen ? "Loja aberta" : "Loja fechada"}
      </p>
      <p className="text-sm text-zinc-700">
        {tenant.isOpen
          ? "Os clientes podem fazer pedidos agora."
          : "O cardápio continua visível, mas ninguém consegue pedir."}
      </p>
      <button
        type="button"
        onClick={() => setOpen.mutate(!tenant.isOpen)}
        disabled={setOpen.isPending}
        className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-60 ${
          tenant.isOpen ? "bg-red-600" : "bg-emerald-600"
        }`}
      >
        {setOpen.isPending && <Loader2 className="size-5 animate-spin" />}
        {tenant.isOpen ? "Fechar a loja" : "Abrir a loja"}
      </button>
      {!tenant.approved && (
        <p className="mt-2 text-sm text-amber-800">
          Sua loja ainda não foi aprovada: o cardápio não aparece para os
          clientes.
        </p>
      )}
      <a
        href={`/${tenant.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex h-11 items-center gap-1 text-sm font-medium text-zinc-700 underline"
      >
        Ver meu cardápio <ExternalLink className="size-4" />
      </a>
    </section>
  );
}

function LogoCard({ tenant }: { tenant: PanelTenant }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => uploadLogo(await prepareImage(file)),
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success("Logo atualizada.");
    },
    onError: (err) =>
      setError(isApiError(err) ? uploadErrorText(err) : "Erro inesperado."),
  });
  const remove = useMutation({
    mutationFn: removeLogo,
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success("Logo removida: o cardápio mostra as iniciais.");
    },
    onError: (err) =>
      setError(isApiError(err) ? uploadErrorText(err) : "Erro inesperado."),
  });
  const busy = upload.isPending || remove.isPending;

  return (
    <Card
      title="Logo"
      description="Aparece no topo do cardápio. JPEG, PNG ou WebP; fotos grandes são reduzidas antes do envio."
    >
      <div className="flex items-center gap-4">
        {tenant.logo ? (
          <img
            src={tenant.logo.url}
            alt={tenant.logo.alt}
            className="size-20 shrink-0 rounded-2xl object-cover"
            data-testid="logo-preview"
          />
        ) : (
          <span
            className="flex size-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
            style={{ backgroundColor: tenant.primaryColor }}
            data-testid="logo-initials"
          >
            {tenant.initials}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 font-semibold text-zinc-800 disabled:opacity-60"
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImageUp className="size-4" />
            )}
            {upload.isPending
              ? "Enviando…"
              : tenant.logo
                ? "Trocar logo"
                : "Enviar logo"}
          </button>
          {tenant.logo && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                remove.mutate();
              }}
              disabled={busy}
              className="h-11 rounded-xl text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              {remove.isPending ? "Removendo…" : "Remover logo"}
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGES}
        className="hidden"
        data-testid="logo-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError(null);
          upload.mutate(file);
        }}
      />
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
    </Card>
  );
}

const toText = (n: number | null) => (n === null ? "" : String(n));
const minutesOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

function DataForm({ tenant }: { tenant: PanelTenant }) {
  const qc = useQueryClient();
  const [name, setName] = useState(tenant.name);
  const [whatsapp, setWhatsapp] = useState(maskPhone(tenant.whatsapp));
  const [phone, setPhone] = useState(maskPhone(tenant.phone ?? ""));
  const [color, setColor] = useState(tenant.primaryColor);
  const [minT, setMinT] = useState(toText(tenant.deliveryTimeMinMinutes));
  const [maxT, setMaxT] = useState(toText(tenant.deliveryTimeMaxMinutes));
  const [minOrder, setMinOrder] = useState(
    tenant.minOrderCents === null ? "" : formatBRL(tenant.minOrderCents),
  );
  const [pix, setPix] = useState(tenant.pixKey ?? "");
  const [pickup, setPickup] = useState(tenant.acceptsPickup);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (patch: SettingsPatch) => updateSettings(patch),
    onSuccess: (data) => {
      qc.setQueryData(panelKeys.tenant, data);
      toast.success("Dados da loja salvos.");
    },
    onError: (err) => {
      const { field, message } = splitFieldError(err);
      if (field) setErrors({ [field]: message });
      else setFormError(message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    setFormError(null);
    const errs: Record<string, string> = {};
    const wa = onlyDigits(whatsapp);
    if (!name.trim()) errs.name = "Informe o nome da loja.";
    if (wa.length < 10 || wa.length > 11)
      errs.whatsapp = "Informe o WhatsApp com DDD (ex.: (15) 99999-8888).";
    const ph = onlyDigits(phone);
    if (ph && (ph.length < 10 || ph.length > 11))
      errs.phone = "Telefone com DDD, ou deixe em branco.";
    const tMin = minutesOrNull(minT);
    const tMax = minutesOrNull(maxT);
    if ((tMin === null) !== (tMax === null))
      errs.deliveryTimeMaxMinutes = "Preencha os dois tempos, ou nenhum.";
    else if (tMin !== null && tMax !== null && tMin > tMax)
      errs.deliveryTimeMaxMinutes =
        "O tempo mínimo não pode ser maior que o máximo.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    save.mutate({
      name: name.trim(),
      whatsapp: `55${wa}`,
      phone: ph ? `55${ph}` : null,
      primaryColor: color,
      deliveryTimeMinMinutes: tMin,
      deliveryTimeMaxMinutes: tMax,
      minOrderCents: maskMoney(minOrder).cents,
      pixKey: pix.trim() || null,
      acceptsPickup: pickup,
    });
  };

  return (
    <Card title="Dados da loja">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nome da loja" error={errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 80))}
            className={inputClass}
          />
        </Field>
        <Field
          label="WhatsApp que recebe os pedidos"
          hint="Com DDD. Os pedidos dos clientes chegam neste número."
          error={errors.whatsapp}
        >
          <input
            inputMode="tel"
            autoComplete="off"
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Telefone fixo (opcional)" error={errors.phone}>
          <input
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entrega: mín. (min)">
            <input
              inputMode="numeric"
              value={minT}
              onChange={(e) => setMinT(onlyDigits(e.target.value).slice(0, 3))}
              placeholder="30"
              className={inputClass}
            />
          </Field>
          <Field label="Entrega: máx. (min)">
            <input
              inputMode="numeric"
              value={maxT}
              onChange={(e) => setMaxT(onlyDigits(e.target.value).slice(0, 3))}
              placeholder="50"
              className={inputClass}
            />
          </Field>
        </div>
        {(errors.deliveryTimeMaxMinutes || errors.deliveryTimeMinMinutes) && (
          <p role="alert" className="-mt-2 text-sm text-red-700">
            {errors.deliveryTimeMaxMinutes ?? errors.deliveryTimeMinMinutes}
          </p>
        )}
        <Field
          label="Pedido mínimo (opcional)"
          hint="Sem contar a entrega. Em branco: sem mínimo."
          error={errors.minOrderCents}
        >
          <input
            inputMode="numeric"
            value={minOrder}
            onChange={(e) => setMinOrder(maskMoney(e.target.value).text)}
            placeholder="Sem mínimo"
            className={inputClass}
          />
        </Field>
        <Field
          label="Chave Pix (opcional)"
          hint="Aparece para o cliente que escolher Pix. Em branco: você envia pelo WhatsApp."
          error={errors.pixKey}
        >
          <input
            value={pix}
            autoCapitalize="none"
            onChange={(e) => setPix(e.target.value.slice(0, 140))}
            className={inputClass}
          />
        </Field>
        <Field label="Cor do cardápio" error={errors.primaryColor}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-12 w-16 cursor-pointer rounded-xl border border-zinc-300 bg-white p-1"
              aria-label="Escolher cor"
            />
            <span className="font-mono text-sm text-zinc-600">
              {color.toUpperCase()}
            </span>
          </div>
        </Field>
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-300 px-3">
          <span className="text-base text-zinc-800">
            Aceita retirada no local
          </span>
          <input
            type="checkbox"
            checked={pickup}
            onChange={(e) => setPickup(e.target.checked)}
            className="size-6 accent-zinc-900"
          />
        </label>

        {formError && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={save.isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="size-5 animate-spin" />}
          Salvar dados
        </button>
      </form>
    </Card>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  label,
  error,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500"
          aria-label={
            show
              ? `Esconder ${label.toLowerCase()}`
              : `Mostrar ${label.toLowerCase()}`
          }
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </Field>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (message) => {
      toast.success(message);
      setCurrent("");
      setNext("");
      setConfirm("");
      setErrors({});
    },
    onError: (err) => {
      const { field, message } = splitFieldError(err);
      if (field) setErrors({ [field]: message });
      else setFormError(message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    setFormError(null);
    const errs: Record<string, string> = {};
    if (!current) errs.currentPassword = "Informe a senha atual.";
    if (next.trim().length < 8)
      errs.newPassword = "A nova senha precisa ter pelo menos 8 caracteres.";
    else if (next === current)
      errs.newPassword = "A nova senha deve ser diferente da atual.";
    if (confirm !== next)
      errs.confirmPassword = "A confirmação não confere com a nova senha.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    mutation.mutate({
      currentPassword: current,
      newPassword: next,
      confirmPassword: confirm,
    });
  };

  return (
    <Card
      title="Alterar senha"
      description="Ao trocar, os outros aparelhos conectados saem e precisam entrar de novo."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {/* ajuda gerenciadores de senha a associar a conta */}
        <input
          type="text"
          autoComplete="username"
          className="hidden"
          readOnly
        />
        <PasswordInput
          label="Senha atual"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          error={errors.currentPassword}
        />
        <PasswordInput
          label="Nova senha"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          error={errors.newPassword}
          hint="Pelo menos 8 caracteres."
        />
        <PasswordInput
          label="Confirmar nova senha"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirmPassword}
        />
        {formError && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending && <Loader2 className="size-5 animate-spin" />}
          Alterar senha
        </button>
      </form>
    </Card>
  );
}
