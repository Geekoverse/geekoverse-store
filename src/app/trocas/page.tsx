import Link from "next/link";

export default function TrocasPage() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <p className="text-xs tracking-[0.35em] text-cream/60">SAGYX • REGRAS CLARAS</p>
      <h1 className="mt-2 text-3xl font-bold">Trocas e devoluções</h1>
      <p className="mt-2 text-sm text-cream/60">
        Todas as peças SAGYX são personalizadas e feitas sob demanda, só pra você.
        Na dúvida, chama no WhatsApp antes de comprar.
      </p>

      <div className="mt-6 rounded-2xl border border-cream/10 bg-coal p-5">
        <p className="text-lg font-bold">🎨 Peças personalizadas SAGYX</p>
        <ul className="mt-3 space-y-2 text-sm text-cream/75">
          <li>✅ <strong>Defeito ou erro nosso</strong>: troca grátis total. Avise em até 7 dias corridos após receber, com fotos da peça e da embalagem</li>
          <li>❌ <strong>Sem troca</strong> por tamanho errado, cor ou arrependimento — a peça é produzida exclusivamente pro seu pedido e não pode ser revendida</li>
          <li>📌 Confira a <strong>tabela de medidas</strong> antes de fechar: na dúvida entre dois tamanhos, pegue o maior</li>
        </ul>
      </div>

      <div className="mt-4 rounded-2xl border border-cream/10 p-5 text-sm text-cream/75">
        <p className="font-semibold text-cream">Como pedir uma troca por defeito</p>
        <p className="mt-2">1. Chama no WhatsApp com número do pedido + fotos do problema</p>
        <p>2. A gente confirma e passa as instruções</p>
        <p>3. Aprovada a troca, enviamos a nova peça em até 5 dias úteis, sem custo</p>
        <p className="mt-3 text-xs text-cream/50">
          Reembolso (quando aplicável): Pix em até 5 dias úteis; cartão via estorno em até 2 faturas.
          O frete da troca por defeito ou erro nosso é por nossa conta.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/catalogo" className="rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-ink">
          Ver catálogo
        </Link>
        <Link href="/" className="rounded-full border border-cream/20 px-5 py-2.5 text-sm">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
