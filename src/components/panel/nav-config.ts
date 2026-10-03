import {
  Armchair,
  Bike,
  BookOpen,
  type LucideIcon,
  ReceiptText,
  Store,
} from "lucide-react";

/**
 * Navegação do painel: UMA lista para a barra lateral (desktop), o trilho
 * (tablet), a barra inferior e o "Mais" (celular).
 *
 * Para acrescentar uma área (ex.: Relatórios), basta um item novo aqui:
 *   {
 *     key: "relatorios",
 *     href: "/painel/relatorios",
 *     label: "Relatórios",
 *     icon: ChartColumn,
 *     match: (p) => p.startsWith("/painel/relatorios"),
 *     mobile: "more",
 *   }
 * A página usa <PanelPage width="wide"> (grade de cartões e gráficos). A rota
 * fica sob /painel, que já é slug reservado.
 */
export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  /** celular: na barra inferior ("primary") ou dentro do "Mais" ("more") */
  mobile: "primary" | "more";
  /** contador ao lado do item */
  badge?: "pending";
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: "pedidos",
    href: "/painel",
    label: "Pedidos",
    icon: ReceiptText,
    match: (p) => p === "/painel" || p.startsWith("/painel/pedidos"),
    mobile: "primary",
    badge: "pending",
  },
  {
    key: "mesas",
    href: "/painel/mesas",
    label: "Mesas",
    icon: Armchair,
    match: (p) => p.startsWith("/painel/mesas"),
    mobile: "primary",
  },
  {
    key: "cardapio",
    href: "/painel/cardapio",
    label: "Cardápio",
    icon: BookOpen,
    match: (p) => p.startsWith("/painel/cardapio"),
    mobile: "primary",
  },
  {
    key: "entrega",
    href: "/painel/entrega",
    label: "Entrega",
    icon: Bike,
    match: (p) => p.startsWith("/painel/entrega"),
    mobile: "more",
  },
  {
    key: "loja",
    href: "/painel/loja",
    label: "Loja",
    icon: Store,
    match: (p) => p.startsWith("/painel/loja"),
    mobile: "more",
  },
];

export const currentNavItem = (pathname: string) =>
  NAV_ITEMS.find((i) => i.match(pathname));

/**
 * Botão flutuante "+" (Novo pedido) no celular: escondido no próprio Novo
 * pedido e nos detalhes (pedido e comanda), que têm barra de ação fixa.
 */
export const showNewOrderFab = (pathname: string) =>
  !/^\/painel\/(pedidos|mesas)\/[^/]+/.test(pathname);
