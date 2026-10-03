import { redirect } from "next/navigation";

// Horários foi para Loja → Horários (Etapa 3); o endereço antigo continua valendo.
export default function Page() {
  redirect("/painel/loja/horarios");
}
