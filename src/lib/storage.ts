/**
 * Acesso seguro a localStorage/sessionStorage: em aba anônima, com cookies
 * bloqueados ou no navegador interno de apps, o acesso pode lançar exceção.
 * Nada aqui pode quebrar a página — no pior caso, os dados não persistem.
 */
type Kind = "local" | "session";

const area = (kind: Kind): Storage | null => {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export function readJSON<T>(kind: Kind, key: string): T | null {
  try {
    const raw = area(kind)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(kind: Kind, key: string, value: unknown): void {
  try {
    area(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    // cota cheia ou armazenamento bloqueado: segue sem persistir
  }
}

export function readText(kind: Kind, key: string): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeText(kind: Kind, key: string, value: string): void {
  try {
    area(kind)?.setItem(key, value);
  } catch {
    // ignora
  }
}

export function remove(kind: Kind, key: string): void {
  try {
    area(kind)?.removeItem(key);
  } catch {
    // ignora
  }
}
