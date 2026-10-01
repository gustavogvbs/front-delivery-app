import { isApiError } from "./http";

/**
 * Erros de validação do back vêm como "campo: motivo" (ex.:
 * "newPassword: a nova senha precisa ter pelo menos 8 caracteres").
 * Separa o campo para mostrar a mensagem embaixo do input certo.
 */
export function splitFieldError(err: unknown): {
  field: string | null;
  message: string;
} {
  if (!isApiError(err))
    return { field: null, message: "Erro inesperado. Tente de novo." };
  if (err.status === 0)
    return {
      field: null,
      message: "Sem conexão com o servidor. Tente de novo.",
    };
  const m = /^([\w.]+): (.+)$/.exec(err.message);
  if (!m) return { field: null, message: err.message };
  const text = m[2].charAt(0).toUpperCase() + m[2].slice(1);
  return { field: m[1], message: text.endsWith(".") ? text : `${text}.` };
}
