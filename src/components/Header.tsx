"use client";

import Link from "next/link";
import { useCart } from "@/context/cart-context";
import { SITE_NAME } from "@/lib/config";

export function Header() {
  const { count } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-cream/10 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sagyx-icon.png" alt="SAGYX" className="h-9 w-9 rounded-full object-cover" />
          <span className="text-sm font-semibold tracking-[0.35em]">{SITE_NAME}</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-cream/80">
          <Link href="/" className="hover:text-cream">Início</Link>
          <Link href="/catalogo" className="hover:text-cream">Catálogo</Link>
          <Link href="/sobre" className="hover:text-cream">Sobre</Link>
          <Link
            href="/carrinho"
            className="rounded-full border border-cream/20 px-3 py-1.5 hover:border-cream/60"
          >
            Carrinho ({count})
          </Link>
        </nav>
      </div>
    </header>
  );
}
