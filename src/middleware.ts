import { NextRequest, NextResponse } from "next/server";

/**
 * 1) /api/users/* (login, logout, senha) → API (Render), com o IP real do
 *    cliente assinado — é onde há rate limit por IP no painel. O resto de
 *    /api/* segue no rewrite do next.config (sem passar pelo middleware, o
 *    que também evita o limite de corpo do middleware nos uploads).
 *    A API só confia em `x-client-ip` quando `x-proxy-secret` confere com o
 *    PROXY_SECRET dela. Os dois headers são SOBRESCRITOS aqui (um cliente não
 *    consegue mandá-los por conta própria) e vão só na requisição para a API:
 *    nunca na resposta ao navegador.
 * 2) /painel sem cookie de sessão → login (guardando a página de origem).
 *    Só confere se o cookie existe; quem valida é a API (401 → login, no cliente).
 */
const API_URL = (process.env.API_URL || "http://localhost:8080").replace(
  /\/+$/,
  "",
);

/** IP do cliente como a Vercel o vê (ela sobrescreve o X-Forwarded-For). */
function clientIp(req: NextRequest): string | null {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || null;
}

function proxyToApi(req: NextRequest) {
  const target = new URL(
    API_URL + req.nextUrl.pathname.replace(/^\/api/, "") + req.nextUrl.search,
  );
  const headers = new Headers(req.headers);
  headers.delete("x-proxy-secret");
  headers.delete("x-client-ip");
  const secret = process.env.PROXY_SECRET;
  const ip = clientIp(req);
  // Só na Vercel: localmente o X-Forwarded-For não é confiável (sem segredo, a
  // API usa o próprio req.ip)
  if (process.env.VERCEL && secret && ip) {
    headers.set("x-proxy-secret", secret);
    headers.set("x-client-ip", ip);
  }
  return NextResponse.rewrite(target, { request: { headers } });
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/users/")) return proxyToApi(req);

  if (req.cookies.get("token")?.value) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/painel/login";
  url.search = "";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/api/users/:path*", "/painel", "/painel/((?!login).*)"],
};
