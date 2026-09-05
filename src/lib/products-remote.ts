import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Product } from "@/types/catalog";

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number | string;
  kind: string;
  category: string | null;
  images: { src: string; alt: string }[] | null;
  sizes: string[] | null;
  colors: { id: string; name: string; hex: string }[] | null;
  active: boolean | null;
  featured: boolean | null;
  created_at: string | null;
};

export function rowToProduct(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description ?? "",
    price: Number(r.price) || 0,
    kind: r.kind === "moletom" ? "moletom" : "camiseta",
    category: r.category ?? "",
    images:
      r.images && r.images.length > 0
        ? r.images
        : [{ src: "/logo.jpeg", alt: `${r.name} — frente` }],
    sizes: r.sizes && r.sizes.length > 0 ? r.sizes : ["P", "M", "G", "GG"],
    colors:
      r.colors && r.colors.length > 0
        ? r.colors
        : [{ id: "preta", name: "Preta", hex: "#111111" }],
    active: r.active ?? true,
    featured: r.featured ?? false,
    createdAt: (r.created_at ?? new Date().toISOString()).slice(0, 10),
  };
}

export async function fetchProducts(): Promise<{ products: Product[]; source: "supabase" | "fallback"; error?: string }> {
  if (!supabaseConfigured || !supabase) {
    return { products: [], source: "fallback", error: "supabase-nao-configurado" };
  }
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) {
    return { products: [], source: "fallback", error: error.message };
  }
  return { products: (data as Row[]).map(rowToProduct), source: "supabase" };
}

export async function upsertProduct(p: Product): Promise<{ error?: string }> {
  if (!supabaseConfigured || !supabase) return { error: "supabase-nao-configurado" };
  const { error } = await supabase.from("products").upsert(
    {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      kind: p.kind,
      category: p.category,
      images: p.images,
      sizes: p.sizes,
      colors: p.colors,
      active: p.active,
      featured: p.featured ?? false,
    },
    { onConflict: "slug" }
  );
  if (error) return { error: error.message };
  return {};
}

export async function deleteProduct(slug: string): Promise<{ error?: string }> {
  if (!supabaseConfigured || !supabase) return { error: "supabase-nao-configurado" };
  const { error } = await supabase.from("products").delete().eq("slug", slug);
  if (error) return { error: error.message };
  return {};
}
