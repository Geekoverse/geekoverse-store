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
  personalized?: boolean | null;
  dimona_sku?: string | null;
  print_art_url?: string | null;
  dimona_variant_skus?: Record<string, string> | null;
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
        : [{ src: "/sagyx-icon.png", alt: `${r.name} — frente` }],
    sizes: r.sizes && r.sizes.length > 0 ? r.sizes : ["P", "M", "G", "GG"],
    colors:
      r.colors && r.colors.length > 0
        ? r.colors
        : [{ id: "preta", name: "Preta", hex: "#111111" }],
    active: r.active ?? true,
    featured: r.featured ?? false,
    // Coluna nova: se ainda não foi criada no Supabase, assume personalizada (regra mais segura)
    personalized: r.personalized ?? true,
    // Automação Dimona: colunas novas (migration supabase-automation.sql).
    // Se o banco ainda não foi migrado, vêm como undefined e o admin avisa.
    dimonaSku: r.dimona_sku ?? "",
    printArtUrl: r.print_art_url ?? "",
    dimonaVariantSkus: r.dimona_variant_skus ?? {},
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
  const base = {
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
  };
  // Colunas novas da automação (supabase-automation.sql). Fallback em cascata
  // para bancos ainda não migrados: tenta com tudo → sem variantes → sem nada.
  const full = {
    ...base,
    personalized: p.personalized,
    dimona_sku: (p.dimonaSku ?? "").trim(),
    print_art_url: (p.printArtUrl ?? "").trim(),
    dimona_variant_skus: p.dimonaVariantSkus ?? {},
  };
  let { error } = await supabase
    .from("products")
    .upsert(full, { onConflict: "slug" });
  if (error && /dimona_variant_skus|column|schema cache/i.test(error.message)) {
    const retry = await supabase.from("products").upsert(
      {
        ...base,
        personalized: p.personalized,
        dimona_sku: (p.dimonaSku ?? "").trim(),
        print_art_url: (p.printArtUrl ?? "").trim(),
      },
      { onConflict: "slug" }
    );
    error = retry.error;
  }
  if (error && /personalized|dimona_sku|print_art_url|column|schema cache/i.test(error.message)) {
    const retry = await supabase.from("products").upsert(base, { onConflict: "slug" });
    error = retry.error;
  }
  if (error) return { error: error.message };
  return {};
}

export async function deleteProduct(slug: string): Promise<{ error?: string }> {
  if (!supabaseConfigured || !supabase) return { error: "supabase-nao-configurado" };
  const { error } = await supabase.from("products").delete().eq("slug", slug);
  if (error) return { error: error.message };
  return {};
}

export async function uploadMockup(
  file: File,
  slug: string
): Promise<{ url?: string; error?: string }> {
  if (!supabaseConfigured || !supabase)
    return { error: "Supabase não configurado na Vercel." };
  if (!file.type.startsWith("image/"))
    return { error: "O arquivo precisa ser uma imagem (JPG ou PNG)." };
  if (file.size > 5 * 1024 * 1024)
    return { error: "Imagem muito grande. Use até 5MB." };
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safe = (slug || "produto").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `${safe}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("mockups")
    .upload(path, file, { upsert: true, contentType: file.type || `image/${ext}` });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("mockups").getPublicUrl(path);
  return { url: data.publicUrl };
}

/**
 * Upload da ARTE em alta para o bucket "print-arts" (PNG p/ produção Dimona).
 * Rode supabase-automation.sql antes — senão falha com erro de policy/bucket.
 * Aceita PNG até 15MB (alta resolução 200–300 DPI).
 */
export async function uploadPrintArt(
  file: File,
  slug: string
): Promise<{ url?: string; error?: string }> {
  if (!supabaseConfigured || !supabase)
    return { error: "Supabase não configurado na Vercel." };
  if (!file.type.startsWith("image/"))
    return { error: "A arte precisa ser uma imagem (PNG com fundo transparente)." };
  if (file.size > 15 * 1024 * 1024)
    return { error: "Arte muito grande. Use PNG até 15MB." };
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const safe = (slug || "produto").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `${safe}/arte-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("print-arts")
    .upload(path, file, { upsert: true, contentType: file.type || `image/${ext}` });
  if (error) return { error: `${error.message} — rode supabase-automation.sql no Supabase.` };
  const { data } = supabase.storage.from("print-arts").getPublicUrl(path);
  return { url: data.publicUrl };
}
