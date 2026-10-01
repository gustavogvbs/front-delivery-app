import { env } from "@/config/env";
import axios, { AxiosError, AxiosInstance } from "axios";

/** Erro normalizado da API: sempre tem status e mensagem amigável. */
export interface ApiError {
  status: number;
  message: string;
}

export const isApiError = (e: unknown): e is ApiError =>
  typeof e === "object" && e !== null && "status" in e && "message" in e;

function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    if (error.response) {
      const data = error.response.data as { message?: unknown } | undefined;
      return {
        status: error.response.status,
        message:
          typeof data?.message === "string"
            ? data.message
            : "Não foi possível concluir a operação.",
      };
    }
    // sem resposta: rede, CORS, timeout ou API dormindo (cold start)
    return { status: 0, message: "Não foi possível conectar ao servidor." };
  }
  return { status: 0, message: "Erro inesperado." };
}

function createClient(
  baseURL: string,
  onUnauthorized?: (url: string) => void,
): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 90_000, // cobre o cold start do Render
    headers: { "Content-Type": "application/json" },
  });
  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      const apiError = toApiError(error);
      if (apiError.status === 401 && onUnauthorized) {
        onUnauthorized(
          error instanceof AxiosError ? error.config?.url ?? "" : "",
        );
      }
      return Promise.reject(apiError);
    },
  );
  return client;
}

/** Cardápio e pedidos: direto na API (sem cookie; mantém o IP real do cliente). */
export const publicApi = createClient(env.NEXT_PUBLIC_API_URL);

/** Página do painel atual, para voltar a ela depois do login. */
export const LOGIN_PATH = "/painel/login";

/** Só caminhos internos do painel (evita redirecionamento aberto: //outro.site). */
export const safeNextPath = (value: string | null | undefined) =>
  value &&
  value.startsWith("/painel") &&
  !value.startsWith("//") &&
  !value.startsWith(LOGIN_PATH)
    ? value
    : "/painel";

let redirecting = false;
/** Sessão expirada ou ausente: vai para o login guardando a página de origem. */
function redirectToLogin(url: string) {
  if (typeof window === "undefined" || redirecting) return;
  if (url.includes("/users/login")) return; // senha errada não é sessão expirada
  if (window.location.pathname.startsWith(LOGIN_PATH)) return;
  redirecting = true;
  const next = safeNextPath(window.location.pathname + window.location.search);
  window.location.replace(
    `${LOGIN_PATH}?next=${encodeURIComponent(next)}&expirou=1`,
  );
}

/**
 * Painel da loja: via rewrite /api/* do Next (mesmo domínio do front), para o
 * cookie de sessão ser first-party. Use só no navegador.
 */
export const panelApi = createClient("/api", redirectToLogin);
