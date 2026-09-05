export default function SobrePage() {
  return (
    <div className="py-10">
      <p className="text-xs tracking-[0.35em] text-cream/60">QUEM SOMOS</p>
      <h1 className="mt-2 text-3xl font-bold">GEEKO — Seu universo. Seu estilo.</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-cream/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="Logo GEEKO" className="aspect-square w-full object-cover" />
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-cream/75">
          <p>
            Somos 4 amigos apaixonados por cultura geek. Nosso diferencial são estampas
            minimalistas na frente e nas costas — sem exagero, com estilo para usar todo dia.
          </p>
          <p>
            Trabalhamos com Print on Demand via Dimona: só produzimos o que você compra.
            Sem estoque, menos desperdício, mais liberdade para lançar designs novos sempre.
          </p>
          <div className="rounded-2xl border border-cream/10 bg-coal p-5">
            <p className="font-semibold text-cream">Como funciona</p>
            <p className="mt-2">1. Você monta o carrinho com ID das peças</p>
            <p>2. Finaliza no WhatsApp com a gente</p>
            <p>3. Geramos link Mercado Pago com frete certo pro seu CEP</p>
            <p>4. Enviamos pra Dimona produzir e entregar na sua casa</p>
          </div>
          <p className="text-xs text-cream/50">
            Produção 3–7 dias úteis + transporte. Trocas em até 7 dias. Fale com a gente no WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
