import Link from "next/link";

export default function TrocasPage() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <p className="text-xs tracking-[0.35em] text-cream/60">GEEKO • REGRAS CLARAS</p>
      <h1 className="mt-2 text-3xl font-bold">Trocas e devoluções</h1>
      <p className="mt-2 text-sm text-cream/60">
        Temos dois tipos de peça, com regras diferentes — iguais às dos grandes fornecedores nacionais.
        Na dúvida, chama no WhatsApp antes de comprar.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-cream/10 bg-coal p-5">
          <p className="text-lg font-bold">👕 Peças lisas</p>
          <p className="mt-1 text-xs text-cream/60">Sem estampa • com troca</p>
          <ul className="mt-3 space-y-2 text-sm text-cream/75">
            <li>✅ <strong>Troca de tamanho</strong> em até <strong>7 dias corridos</strong> após receber</li>
            <li>✅ <strong>Arrependimento</strong> em até 7 dias (CDC art. 49), peça sem uso</li>
            <li>✅ <strong>Defeito</strong>: troca grátis total, por nossa conta</li>
            <li>📌 Peça sem uso, com etiquetas; fretes da troca por tamanho por conta do cliente</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-cream/10 bg-coal p-5">
          <p className="text-lg font-bold">🎨 Peças personalizadas</p>
          <p className="mt-1 text-xs text-cream/60">Com estampa Geeko, feitas sob demanda • sem troca por gosto/tamanho</p>
          <ul className="mt-3 space-y-2 text-sm text-cream/75">
            <li>✅ <strong>Defeito ou erro nosso</strong>: troca grátis total (7 dias, com fotos)</li>
            <li>❌ <strong>Sem troca</strong> por tamanho errado, cor ou arrependimento — a peça é feita só pra você e não pode ser revendida</li>
            <li>📌 Confira a <strong>tabela de medidas</strong> antes de fechar: na dúvida, pegue o tamanho maior</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-cream/10 p-5 text-sm text-cream/75">
        <p className="font-semibold text-cream">Como pedir uma troca</p>
        <p className="mt-2">1. Chama no WhatsApp com número do pedido + fotos (se defeito)</p>
        <p>2. A gente confirma e passa as instruções de envio</p>
        <p>3. Recebendo a peça de volta, enviamos a nova em até 5 dias úteis</p>
        <p className="mt-3 text-xs text-cream/50">
          Reembolso (quando aplicável): Pix em até 5 dias úteis; cartão via estorno em até 2 faturas.
          Frete de devolução por defeito ou erro nosso é por nossa conta.
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
