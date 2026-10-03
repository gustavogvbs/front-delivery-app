"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/painel/loja", label: "Dados" },
  { href: "/painel/loja/horarios", label: "Horários" },
  { href: "/painel/loja/impressao", label: "Impressão" },
];

/** Seções da aba Loja (cada uma é uma rota: o link pode ser compartilhado). */
export function StoreSections() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Seções da loja"
      className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-200/70 p-1"
    >
      {SECTIONS.map((s) => {
        const current = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={current ? "page" : undefined}
            className={`flex h-11 items-center justify-center rounded-lg text-sm font-semibold ${
              current ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
