/**
 * Prepara a foto antes do upload: fotos de celular costumam ter 3–10 MB e o
 * back aceita até 5 MB. Imagens grandes são reduzidas no próprio aparelho
 * (lado maior ≤ 1600 px, JPEG 85%) — o back ainda converte para WebP ≤ 1200 px.
 * Se o navegador não conseguir ler o arquivo (ex.: HEIC no Chrome), envia o
 * original e o back responde com a mensagem de formato.
 */
const MAX_SIDE = 1600;
const SKIP_BELOW_BYTES = 1_000_000;

export const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp";

export async function prepareImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // fundo branco: PNG com transparência vira JPEG sem fundo preto
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Mensagens do back para upload (413/415) já são amigáveis; rede vira texto genérico. */
export const uploadErrorText = (err: { status: number; message: string }) =>
  err.status === 0
    ? "Não foi possível enviar a foto. Confira a conexão e tente de novo."
    : err.message;
