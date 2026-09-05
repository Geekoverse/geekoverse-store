"use client";

import { useEffect, useState } from "react";
import { PRODUCTS } from "@/data/products";
import { CUSTOM_PRODUCTS_KEY } from "@/lib/config";
import { fetchProducts } from "@/lib/products-remote";
import type { Product } from "@/types/catalog";

function loadLocalCustom(): Product[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

export function useProducts() {
  const [remote, setRemote] = useState<Product[] | null>(null);
  const [source, setSource] = useState<"supabase" | "local">("local");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const localCustom = loadLocalCustom();
      const { products, source: src, error } = await fetchProducts();
      if (!alive) return;
      if (src === "supabase") {
        const slugs = new Set(products.map((p) => p.slug));
        const merged = [
          ...products,
          ...localCustom.filter((p) => !slugs.has(p.slug)),
          ...PRODUCTS.filter(
            (p) => !slugs.has(p.slug) && !localCustom.some((c) => c.slug === p.slug)
          ),
        ];
        setRemote(merged);
        setSource("supabase");
      } else {
        setRemote([...localCustom, ...PRODUCTS.filter((p) => !localCustom.some((c) => c.slug === p.slug))]);
        setSource("local");
        if (error && error.includes("products")) {
          setNotice("Tabela products ainda não criada no Supabase — usando produtos locais. Rode o SQL.");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return {
    products: remote ?? [...loadLocalSnapshot(), ...PRODUCTS],
    source,
    notice,
    ready: remote !== null,
  };
}

function loadLocalSnapshot(): Product[] {
  return [];
}
