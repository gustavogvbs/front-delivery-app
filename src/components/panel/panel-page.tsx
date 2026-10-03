import { cn } from "@/lib/utils";

/**
 * Área de conteúdo de uma tela do painel.
 * - "wide": listas, grades e dashboards (até 1440 px; ex.: Pedidos, Mesas,
 *   Cardápio e, no futuro, Relatórios);
 * - "detail": detalhe em duas colunas no desktop (até 1152 px);
 * - "read": formulários com largura de leitura (até 768 px).
 */
const WIDTH = {
  wide: "max-w-[1440px]",
  detail: "max-w-6xl",
  read: "max-w-3xl",
} as const;

export function PanelPage({
  width,
  className,
  children,
}: {
  width: keyof typeof WIDTH;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-4 pb-16 pt-4 md:px-6 md:pt-6",
        WIDTH[width],
        className,
      )}
    >
      {children}
    </main>
  );
}

/**
 * Barra de ação fixa no rodapé (confirmar pedido, aceitar, fechar conta):
 * fica acima da barra inferior do celular e à direita da lateral do
 * tablet/desktop (variáveis --panel-bottom e --panel-left do PanelShell).
 */
export function ActionBar({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-[var(--panel-bottom)] left-[var(--panel-left)] right-0 z-30 border-t bg-white px-4 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] md:px-6",
        "pb-3 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-testid="action-bar"
    >
      <div className={cn("mx-auto max-w-3xl", innerClassName)}>{children}</div>
    </div>
  );
}
