import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8 text-zinc-700">
      <h1 className="text-2xl font-bold text-zinc-900">
        Política de privacidade
      </h1>
      <p>
        Usamos seus dados (nome, telefone, endereço e local de entrega) apenas
        para processar e entregar o seu pedido. Eles são compartilhados somente
        com o estabelecimento em que você fez o pedido.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-zinc-900">
        O que guardamos
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Os dados do pedido, para que a loja possa atendê-lo.</li>
        <li>
          Neste aparelho, seu nome, telefone e último endereço ficam salvos no
          navegador para agilizar os próximos pedidos. Você pode apagá-los
          limpando os dados do site.
        </li>
      </ul>
      <h2 className="pt-2 text-lg font-semibold text-zinc-900">
        Por quanto tempo
      </h2>
      <p>
        Os dados pessoais dos pedidos são anonimizados após um período máximo de
        12 meses. Os valores e itens permanecem apenas para fins contábeis da
        loja.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-zinc-900">
        Seus direitos
      </h2>
      <p>
        Você pode pedir a correção ou a exclusão dos seus dados entrando em
        contato com o estabelecimento pelo WhatsApp informado no pedido.
      </p>
    </main>
  );
}
