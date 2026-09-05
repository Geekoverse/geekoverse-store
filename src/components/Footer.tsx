import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-cream/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold tracking-[0.35em]">{SITE_NAME}</p>
          <p className="mt-2 text-sm text-cream/60">{SITE_TAGLINE}</p>
          <p className="mt-2 text-xs text-cream/50">
            Peças geek minimalistas frente + verso. Produção sob demanda via Dimona.
          </p>
        </div>
        <div className="text-sm text-cream/70">
          <p className="font-semibold text-cream">Como comprar</p>
          <p className="mt-2">1. Monte o carrinho</p>
          <p>2. Finalize no WhatsApp</p>
          <p>3. Receba o link Mercado Pago com frete</p>
          <p>4. Produzimos e enviamos</p>
        </div>
        <div className="text-sm text-cream/70">
          <p className="font-semibold text-cream">Prazos</p>
          <p className="mt-2">Produção Dimona: 3–7 dias úteis + transporte.</p>
          <p className="mt-2">
            <a href="/trocas" className="underline">Trocas e devoluções</a>: peças
            personalizadas trocam apenas por defeito.
          </p>
        </div>
      </div>
    </footer>
  );
}
