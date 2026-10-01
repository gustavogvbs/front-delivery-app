import { useSyncExternalStore } from "react";

import { isApiError, publicApi } from "./http";

/**
 * A API no Render gratuito "dorme" e leva ~30–60 s para acordar. Erros de
 * rede (status 0) e 502/503/504 são tratados como "conectando": tenta de novo
 * com espera crescente, por até ~90 s. O estado "conectando" é global (um
 * contador de operações aguardando), lido pelo aviso via useConnecting().
 */
export const isTransient = (e: unknown) =>
  isApiError(e) &&
  (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504);

const DELAYS_MS = [
  2000, 4000, 8000, 8000, 8000, 10000, 10000, 10000, 15000, 15000,
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── store global "conectando" ──
let waiting = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** true enquanto alguma operação aguarda a API acordar. */
export const useConnecting = () =>
  useSyncExternalStore(
    subscribe,
    () => waiting > 0,
    () => false,
  );

export async function withWakeRetry<T>(fn: () => Promise<T>): Promise<T> {
  let marked = false;
  const mark = (on: boolean) => {
    if (on === marked) return;
    marked = on;
    waiting += on ? 1 : -1;
    emit();
  };
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (!isTransient(err) || attempt >= DELAYS_MS.length) throw err;
        mark(true);
        await sleep(DELAYS_MS[attempt]);
      }
    }
  } finally {
    mark(false);
  }
}

/** Ping leve para "acordar" a API assim que a página abre. */
export const pingHealth = () =>
  publicApi.get("/health", { timeout: 15_000 }).catch(() => undefined);
