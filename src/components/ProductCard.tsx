import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-cream/10 bg-coal"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.images[0]?.src ?? "/logo.jpeg"}
        alt={product.images[0]?.alt ?? product.name}
        className="aspect-square w-full object-cover"
      />
      <div className="p-4">
        <p className="text-[11px] tracking-widest text-cream/50">
          {product.id} • {product.kind}
        </p>
        <h3 className="mt-1 font-semibold">{product.name}</h3>
        <p className="mt-1 text-sm text-cream/70">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
