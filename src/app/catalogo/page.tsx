"use client";

import { useEffect, useMemo, useState } from "react";
import { getAllProducts } from "@/data/products";
import { CUSTOM_PRODUCTS_KEY } from "@/lib/config";
import type { Product } from "@/types/catalog";
import { ProductCard } from "@/components/ProductCard";

export default function CatalogoPage() {
  const [custom, setCustom] = useState<Product[]>([]);
  const [kind, setKind] = useState<"todos" | "camiseta" | "moletom">("todos");
  const [q, setQ] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
      if (raw) setCustom(JSON.parse(raw) as Product[]);
    } catch {}
  }, []);

  const all = useMemo(() => {
    const list = getAllProducts(custom);
    return list.filter((p) => {
      if (kind !== "todos" && p.kind !== kind) return false;
      if (!q) return true;
      const hay = `${p.id} ${p.name} ${p.description} ${p.category}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [custom, kind, q]);

  return (
    <div className="py-10">
      <h1 className="text-2xl font-bold">Catálogo</h1>
      <p className="mt-1 text-sm text-cream/60">
        Todos com ID visível para não confundir no pedido.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["todos", "camiseta", "moletom"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-1.5 text-sm border ${
              kind === k ? "bg-cream text-ink border-cream" : "border-cream/20 text-cream/80"
            }`}
          >
            {k === "todos" ? "Todos" : k === "camiseta" ? "Camisetas" : "Moletons"}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, ID, categoria…"
          className="min-w-[220px] flex-1 rounded-full border border-cream/20 bg-transparent px-4 py-1.5 text-sm placeholder:text-cream/30"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {all.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
      {all.length === 0 && <p className="mt-6 text-sm text-cream/60">Nada por aqui ainda.</p>}
    </div>
  );
}
