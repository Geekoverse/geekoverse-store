"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRODUCTS, getAllProducts } from "@/data/products";
import { CUSTOM_PRODUCTS_KEY } from "@/lib/config";
import type { Product } from "@/types/catalog";
import { ProductCard } from "@/components/ProductCard";

function loadCustom(): Product[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

export default function Home() {
  const [custom, setCustom] = useState<Product[]>([]);

  useEffect(() => {
    setCustom(loadCustom());
  }, []);

  const all = getAllProducts(custom);
  const featured = all.filter((p) => p.featured).slice(0, 6);

  return (
    <div className="py-10">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-cream/60">GEEKO • GEEK MINIMALISTA</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            Seu universo.
            <br />
            Seu estilo.
          </h1>
          <p className="mt-4 max-w-md text-cream/70">
            Camisetas e moletons com estampas discretas na frente e nas costas.
            Qualquer um pode usar, só quem é do universo entende.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/catalogo" className="rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-ink">
              Ver catálogo
            </Link>
            <Link href="/sobre" className="rounded-full border border-cream/20 px-5 py-2.5 text-sm">
              Conhecer a GEEKO
            </Link>
          </div>
          <p className="mt-4 text-xs text-cream/50">
            Produção sob demanda • Sem estoque • Feito via Dimona após pagamento
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-cream/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="GEEKO — logo" className="aspect-square w-full object-cover" />
        </div>
      </section>

      <div className="hairline my-10" />

      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Destaques</h2>
          <Link href="/catalogo" className="text-sm text-cream/70 hover:text-cream">
            Ver tudo →
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
        {featured.length === 0 && (
          <p className="mt-4 text-sm text-cream/60">
            Nenhum produto ativo. Cadastre no /admin.
          </p>
        )}
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { t: "1. Monte o carrinho", d: "Escolha modelo, tamanho, cor e quantidade. Anote o ID de cada peça." },
          { t: "2. Finalize no WhatsApp", d: "Um clique leva seu pedido pronto pro nosso WhatsApp." },
          { t: "3. Pague e receba", d: "Geramos o link Mercado Pago com frete e a Dimona produz e envia." },
        ].map((s) => (
          <div key={s.t} className="rounded-2xl border border-cream/10 bg-coal p-5">
            <p className="font-semibold">{s.t}</p>
            <p className="mt-2 text-sm text-cream/70">{s.d}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 hidden text-xs text-cream/30">
        fallback count: {PRODUCTS.length}
      </p>
    </div>
  );
}
