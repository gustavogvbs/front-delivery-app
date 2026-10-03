/**
 * Sinal de "cupom pronto" nas páginas da bobina, lido pelo app desktop (que
 * imprime a página numa janela oculta, em silêncio). Fica no <html>:
 * data-print-ready="true" e o tamanho do papel em mm (largura da loja ×
 * altura do conteúdo), que o app passa como pageSize ao driver.
 */
export function markPrintReady(widthMm: number, heightMm: number) {
  const el = document.documentElement;
  el.dataset.pageWidthMm = String(widthMm);
  el.dataset.pageHeightMm = String(heightMm);
  el.dataset.printReady = "true";
}
