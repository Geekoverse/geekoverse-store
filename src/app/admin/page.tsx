"use client";

import { useEffect, useState } from "react";
import { CUSTOM_PRODUCTS_KEY, DEFAULT_SIZES_TOP } from "@/lib/config";
import { supabaseConfigured } from "@/lib/supabase";
import { deleteProduct, fetchProducts, upsertProduct } from "@/lib/products-remote";
import type { Product } from "@/types/catalog";
import { PRODUCTS } from "@/data/products";

const empty: Product = {
  id: "GKV-CAM-000",
  name: "",
  slug: "",
  description: "",
  price: 89.9,
  kind: "camiseta",
  category: "Games",
  images: [{ src: "/logo.jpeg", alt: "frente" }],
  sizes: ["P", "M", "G", "GG"],
  colors: [{ id: "preta", name: "Preta", hex: "#111111" }],
  active: true,
  featured: false,
  createdAt: new Date().toISOString().slice(0, 10),
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [usingRemote, setUsingRemote] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
        if (raw) setItems(JSON.parse(raw) as Product[]);
      } catch {}
      const { products, source } = await fetchProducts();
      if (source === "supabase") {
        setItems(products);
        setUsingRemote(true);
      }
    })();
    if (sessionStorage.getItem("geeko.admin") === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (usingRemote) return;
    localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(items));
  }, [items, usingRemote]);

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm py-16">
        <h1 className="text-xl font-bold">Admin GEEKO</h1>
        <p className="mt-1 text-sm text-cream/60">Acesso só da equipe (4 pessoas).</p>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Senha da equipe"
          className="mt-4 w-full rounded-xl border border-cream/20 bg-transparent px-4 py-2 text-sm"
        />
        <button
          onClick={() => {
            if (pass === (process.env.NEXT_PUBLIC_ADMIN_PASS || "geeko123")) {
              sessionStorage.setItem("geeko.admin", "1");
              setAuthed(true);
            } else alert("Senha incorreta (padrão: geeko123 — troque no .env)");
          }}
          className="mt-3 w-full rounded-full bg-cream py-2.5 text-sm font-semibold text-ink"
        >
          Entrar
        </button>
        <p className="mt-2 text-xs text-cream/40">Troque em NEXT_PUBLIC_ADMIN_PASS no deploy.</p>
      </div>
    );
  }

  const save = async () => {
    if (!form.name || !form.id) return alert("Preencha ID e título");
    const slug = form.slug || slugify(form.name);
    const record = { ...form, slug };
    setMsg(null);

    if (supabaseConfigured && usingRemote) {
      const { error } = await upsertProduct(record);
      if (error) {
        setMsg(`Erro Supabase: ${error}. Verifique se rodou o SQL da tabela products e as policies.`);
        return;
      }
      const { products } = await fetchProducts();
      setItems(products);
    } else if (supabaseConfigured && !usingRemote) {
      // Tabela ainda não existe — salva local e avisa
      if (editing) setItems((cur) => cur.map((p) => (p.slug === editing ? record : p)));
      else {
        if (items.some((p) => p.slug === slug) || PRODUCTS.some((p) => p.slug === slug))
          return alert("Slug/ID já existe");
        setItems((cur) => [record, ...cur]);
      }
      setMsg("Salvo localmente. Rode o SQL no Supabase para centralizar pros 4 — depois recarregue.");
    } else {
      if (editing) setItems((cur) => cur.map((p) => (p.slug === editing ? record : p)));
      else {
        if (items.some((p) => p.slug === slug) || PRODUCTS.some((p) => p.slug === slug))
          return alert("Slug/ID já existe");
        setItems((cur) => [record, ...cur]);
      }
    }
    setForm(empty);
    setEditing(null);
  };

  const remove = async (slug: string) => {
    if (supabaseConfigured && usingRemote) {
      const { error } = await deleteProduct(slug);
      if (error) {
        setMsg(`Erro ao excluir: ${error}`);
        return;
      }
      const { products } = await fetchProducts();
      setItems(products);
    } else {
      setItems((cur) => cur.filter((x) => x.slug !== slug));
    }
  };

  return (
    <div className="py-10">
      <h1 className="text-2xl font-bold">Painel — Produtos</h1>
      <p className="text-sm text-cream/60">
        {usingRemote
          ? "Conectado ao Supabase — todos os 4 veem o mesmo catálogo."
          : "Modo local — rode o SQL no Supabase para centralizar. Veja aviso abaixo."}
      </p>
      {!usingRemote && (
        <p className="mt-3 rounded-2xl border border-yellow-200/20 bg-yellow-200/10 p-3 text-xs text-yellow-100/90">
          Supabase sem tabela <code>products</code> ou sem envs. Rode o SQL que te passei no SQL Editor
          do Supabase e configure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.
          Por enquanto salvando no navegador.
        </p>
      )}
      {msg && <p className="mt-3 rounded-2xl border border-cream/15 bg-coal p-3 text-xs">{msg}</p>}

      <div className="mt-6 grid gap-6 md:grid-cols-[360px_1fr]">
        <div className="h-fit rounded-2xl border border-cream/10 bg-coal p-4 text-sm space-y-3">
          <p className="font-semibold">{editing ? "Editar" : "Novo"} produto</p>
          <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })} placeholder="ID ex GKV-CAM-004" className="w-full rounded-xl border border-cream/20 bg-transparent px-3 py-2" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Título" className="w-full rounded-xl border border-cream/20 bg-transparent px-3 py-2" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" rows={3} className="w-full rounded-xl border border-cream/20 bg-transparent px-3 py-2" />
          <div className="flex gap-2">
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full rounded-xl border border-cream/20 bg-transparent px-3 py-2" />
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Product["kind"] })} className="rounded-xl border border-cream/20 bg-ink px-3 py-2">
              <option value="camiseta">camiseta</option>
              <option value="moletom">moletom</option>
            </select>
          </div>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Categoria ex Games" className="w-full rounded-xl border border-cream/20 bg-transparent px-3 py-2" />
          <input value={form.sizes.join(",")} onChange={(e) => setForm({ ...form, sizes: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) })} placeholder="Tamanhos P,M,G,GG" className="w-full rounded-xl border border-cream/20 bg-transparent px-3 py-2" />
          <p className="text-xs text-cream/50">Tamanhos sugeridos: {DEFAULT_SIZES_TOP.join(", ")}</p>
          <input value={form.images[0]?.src ?? ""} onChange={(e) => setForm({ ...form, images: [{ src: e.target.value, alt: `${form.name} — frente` }, { src: e.target.value, alt: `${form.name} — verso` }] })} placeholder="URL da imagem / mockup" className="w-full rounded-xl border border-cream/20 bg-transparent px-3 py-2" />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destaque na home
          </label>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 rounded-full bg-cream py-2 font-semibold text-ink">{editing ? "Salvar" : "Adicionar"}</button>
            {editing && <button onClick={() => { setEditing(null); setForm(empty); }} className="rounded-full border border-cream/20 px-4">Cancelar</button>}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Produtos ({items.length})</p>
          {items.map((p) => (
            <div key={p.slug} className="flex items-center gap-3 rounded-2xl border border-cream/10 p-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0]?.src} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-[11px] text-cream/50">{p.id}</p>
                <p className="font-semibold">{p.name} — R${p.price}</p>
              </div>
              <button onClick={() => { setForm(p); setEditing(p.slug); }} className="text-xs underline">editar</button>
              <button onClick={() => remove(p.slug)} className="text-xs text-red-300 underline">excluir</button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-cream/50">Nenhum produto ainda.</p>}
        </div>
      </div>
    </div>
  );
}
