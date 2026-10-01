import { NextRequest, NextResponse } from "next/server";

/**
 * Painel sem cookie de sessão → login (guardando a página de origem).
 * Só confere se o cookie existe; quem valida é a API (401 → login, no cliente).
 */
export function middleware(req: NextRequest) {
  if (req.cookies.get("token")?.value) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/painel/login";
  url.search = "";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/painel", "/painel/((?!login).*)"],
};
