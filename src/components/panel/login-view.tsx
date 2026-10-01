"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ConnectingBanner } from "@/components/common/connecting";
import { isApiError, safeNextPath } from "@/lib/http";
import { pingHealth, withWakeRetry } from "@/lib/wake";
import { login, logout } from "@/services/panel-api";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const expired = params.get("expirou") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Acorda a API (Render gratuito) enquanto a lojista digita
  useEffect(() => {
    void pingHealth();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    setBusy(true);
    try {
      const session = await withWakeRetry(() => login(email.trim(), password));
      if (!session.tenant) {
        await logout().catch(() => undefined);
        setError("Este acesso é só para lojas cadastradas.");
        return;
      }
      router.replace(next);
    } catch (err) {
      if (isApiError(err) && err.status === 0) {
        setError(
          "Sem conexão com o servidor. Confira a internet e tente de novo.",
        );
      } else if (isApiError(err)) {
        // 401 (genérica), 429 (aguarde) e 400 já vêm com mensagem amigável
        setError(err.message);
      } else {
        setError("Não foi possível entrar. Tente de novo.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ConnectingBanner />
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-900">Painel da loja</h1>
        <p className="mt-1 text-zinc-600">
          Entre para ver e responder os pedidos.
        </p>

        {expired && !error && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
          >
            Sua sessão expirou. Entre de novo para continuar.
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">E-mail</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-zinc-300 px-3 text-base outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Senha</span>
            <div className="relative mt-1">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-300 pl-3 pr-12 text-base outline-none focus:border-zinc-900"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500"
                aria-label={show ? "Esconder senha" : "Mostrar senha"}
              >
                {show ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            </div>
          </label>

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
            {busy && <Loader2 className="size-5 animate-spin" />}
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </>
  );
}
