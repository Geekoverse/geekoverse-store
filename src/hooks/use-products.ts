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

function mergeLocal(): Product[] {
  const custom = loadLocalCustom();
  return [...custom, ...PRODUCTS.filter((p) => !custom.some((c) => c.slug === p.slug))];
}

export function useProducts() {
  // Quando o Supabase está conectado, o site mostra SÓ o que está no banco
  // (ou seja, só o que o /admin controla). Sem conexão, usa os exemplos locais.
  const [remote, setRemote] = useState<Product[] | null>(null);
  const [source, setSource] = useState<"supabase" | "local">("local");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { products, source: src, error } = await fetchProducts();
      if (!alive) return;
      if (src === "supabase") {
        setRemote(products);
        setSource("supabase");
      } else {
        setRemote(mergeLocal());
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
    products: remote ?? PRODUCTS,
    source,
    notice,
    ready: remote !== null,
  };
}
