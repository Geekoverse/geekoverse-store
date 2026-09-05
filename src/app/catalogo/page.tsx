"use client";

import { useMemo, useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";

export default function CatalogoPage() {
  const { products, notice } = useProducts();
  const [tab, setTab] = useState<"todas" | "personalizadas" | "lisas">("todas");
  const [kind, setKind] = useState<"todos" | "camiseta" | "moletom">("todos");
  const [q, setQ] = useState("");

  const all = useMemo(() => {
    return products.filter((p) => {
      if (tab === "personalizadas" && !p.personalized) return false;
      if (tab === "lisas" && p.personalized) return false;
      if (kind !== "todos" && p.kind !== kind) return false;
      if (!q) return true;
      const hay = `${p.id} ${p.name} ${p.description} ${p.category}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [products, tab, kind, q]);

  return (
    <div className="py-10">
      <h1 className="text-2xl font-bold">Catálogo</h1>
      <p className="mt-1 text-sm text-cream/60">
        Todos com ID visível para não confundir no pedido.
      </p>

      {notice && (
        <p className="mt-4 rounded-2xl border border-yellow-200/20 bg-yellow-200/10 p-3 text-xs text-yellow-100/90">
          {notice}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            { id: "todas", label: "Todas" },
            { id: "personalizadas", label: "🎨 Personalizadas" },
            { id: "lisas", label: "👕 Lisas" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm border ${
              tab === t.id ? "bg-cream text-ink border-cream font-semibold" : "border-cream/20 text-cream/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-cream/50">
        {tab === "personalizadas"
          ? "Feitas sob demanda com nossas estampas: troca apenas por defeito."
          : tab === "lisas"
            ? "Sem estampa: troca de tamanho em até 7 dias após receber."
            : "Personalizadas têm troca só por defeito; lisas trocam de tamanho em 7 dias."}{" "}
        <a href="/trocas" className="underline">Ver política</a>
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
            {k === "todos" ? "Todos os modelos" : k === "camiseta" ? "Camisetas" : "Moletons"}
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
