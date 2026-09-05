"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProduct } from "@/data/products";
import { CUSTOM_PRODUCTS_KEY } from "@/lib/config";
import type { Product } from "@/types/catalog";
import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/format";

export default function ProdutoPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const [custom, setCustom] = useState<Product[]>([]);
  const [size, setSize] = useState("");
  const [colorId, setColorId] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
      if (raw) setCustom(JSON.parse(raw) as Product[]);
    } catch {}
  }, []);

  const product = useMemo(
    () => getProduct(params.slug, custom),
    [params.slug, custom]
  );

  useEffect(() => {
    if (product) {
      setSize(product.sizes[0] ?? "");
      setColorId(product.colors[0]?.id ?? "");
    }
  }, [product]);

  if (!product) {
    return (
      <div className="py-16">
        <p>Produto não encontrado.</p>
        <button onClick={() => router.push("/catalogo")} className="mt-4 underline">
          Voltar ao catálogo
        </button>
      </div>
    );
  }

  const color = product.colors.find((c) => c.id === colorId);

  return (
    <div className="grid gap-8 py-10 md:grid-cols-2">
      <div className="space-y-3">
        {product.images.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.src + img.alt} src={img.src} alt={img.alt} className="w-full rounded-2xl border border-cream/10 object-cover" />
        ))}
      </div>
      <div>
        <p className="text-xs tracking-widest text-cream/50">
          {product.id} • {product.kind} • {product.category}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
        <p className="mt-2 text-xl">{formatPrice(product.price)}</p>
        <p className="mt-4 text-sm leading-relaxed text-cream/75">{product.description}</p>

        <div className="mt-6">
          <p className="text-sm font-semibold">Tamanho</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`rounded-full border px-4 py-1.5 text-sm ${size === s ? "bg-cream text-ink border-cream" : "border-cream/20"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold">Cor</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c.id}
                onClick={() => setColorId(c.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${colorId === c.id ? "border-cream" : "border-cream/20"}`}
              >
                <span className="inline-block h-4 w-4 rounded-full border border-cream/30" style={{ background: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (!size || !color) return;
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              image: product.images[0]?.src ?? "/logo.jpeg",
              size,
              colorId: color.id,
              colorName: color.name,
              unitPrice: product.price,
              quantity: 1,
            });
            router.push("/carrinho");
          }}
          className="mt-6 w-full rounded-full bg-cream py-3 text-sm font-semibold text-ink"
        >
          Adicionar ao carrinho
        </button>
        <p className="mt-3 text-xs text-cream/50">
          Frete calculado no WhatsApp. Produção sob demanda (3–7 dias úteis + entrega).
        </p>
      </div>
    </div>
  );
}
