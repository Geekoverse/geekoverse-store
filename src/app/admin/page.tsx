"use client";

import { useEffect, useRef, useState } from "react";
import { CUSTOM_PRODUCTS_KEY, DEFAULT_SIZES_TOP } from "@/lib/config";
import { supabaseConfigured } from "@/lib/supabase";
import {
  deleteProduct,
  fetchProducts,
  uploadMockup,
  upsertProduct,
} from "@/lib/products-remote";
import type { Product } from "@/types/catalog";
import { PRODUCTS } from "@/data/products";
import { formatPrice } from "@/lib/format";

const COLOR_PRESETS = [
  { id: "preta", name: "Preta", hex: "#111111" },
  { id: "off-white", name: "Off-white", hex: "#f3efe6" },
  { id: "carvao", name: "Carvão", hex: "#2b2b2b" },
  { id: "branca", name: "Branca", hex: "#ffffff" },
  { id: "cinza", name: "Cinza", hex: "#808080" },
];

const empty: Product = {
  id: "GKV-CAM-000",
  name: "",
  slug: "",
  description: "",
  price: 89.9,
  kind: "camiseta",
  category: "Games",
  images: [],
  sizes: ["P", "M", "G", "GG"],
  colors: [{ id: "preta", name: "Preta", hex: "#111111" }],
  active: true,
  featured: false,
  createdAt: new Date().toISOString().slice(0, 10),
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toggle<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function AdminPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [usingRemote, setUsingRemote] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function refresh() {
    const { products, source } = await fetchProducts();
    if (source === "supabase") {
      setItems(products);
      setUsingRemote(true);
    }
  }

  const seedExamples = async () => {
    if (!supabaseConfigured || !usingRemote) {
      setMsg({ ok: false, text: "Conecte o Supabase primeiro (rode o SQL) para importar." });
      return;
    }
    if (!confirm("Importar os 3 produtos de exemplo para o banco?")) return;
    for (const p of PRODUCTS) {
      const { error } = await upsertProduct(p);
      if (error) {
        setMsg({ ok: false, text: `Erro ao importar: ${error}` });
        return;
      }
    }
    await refresh();
    setMsg({ ok: true, text: "Exemplos importados! Agora você edita, tira da home ou apaga eles aqui." });
  };

  async function persist(record: Product, prevSlug: string | null) {
    if (supabaseConfigured && usingRemote) {
      const { error } = await upsertProduct(record);
      if (error) {
        setMsg({ ok: false, text: `Erro ao salvar: ${error}` });
        return false;
      }
      await refresh();
      return true;
    }
    setItems((cur) => {
      if (prevSlug) return cur.map((p) => (p.slug === prevSlug ? record : p));
      return [record, ...cur];
    });
    return true;
  }

  const save = async () => {
    setMsg(null);
    if (!form.name.trim()) {
      setMsg({ ok: false, text: "Dê um título ao produto." });
      return;
    }
    if (!form.id.trim()) {
      setMsg({ ok: false, text: "Preencha o ID (ex: GKV-CAM-004)." });
      return;
    }
    if (form.images.length === 0) {
      setMsg({ ok: false, text: "Adicione pelo menos 1 foto arrastando a imagem." });
      return;
    }
    if (form.sizes.length === 0) {
      setMsg({ ok: false, text: "Escolha pelo menos 1 tamanho." });
      return;
    }
    if (form.colors.length === 0) {
      setMsg({ ok: false, text: "Escolha pelo menos 1 cor." });
      return;
    }
    const slug = form.slug || slugify(form.name);
    const record = { ...form, slug, id: form.id.toUpperCase() };
    if (!editing) {
      if (items.some((p) => p.slug === slug) || PRODUCTS.some((p) => p.slug === slug)) {
        setMsg({ ok: false, text: "Já existe um produto com esse nome. Mude o título." });
        return;
      }
    }
    const ok = await persist(record, editing);
    if (!ok) return;
    setMsg({
      ok: true,
      text: usingRemote
        ? "Produto salvo! Já aparece no site."
        : "Salvo neste navegador. Rode o SQL no Supabase para valer pros 4.",
    });
    setForm(empty);
    setEditing(null);
  };

  const remove = async (slug: string, name: string) => {
    if (!confirm(`Apagar "${name}" do site?`)) return;
    if (supabaseConfigured && usingRemote) {
      const { error } = await deleteProduct(slug);
      if (error) {
        setMsg({ ok: false, text: `Erro ao apagar: ${error}` });
        return;
      }
      await refresh();
    } else {
      setItems((cur) => cur.filter((x) => x.slug !== slug));
    }
    setMsg({ ok: true, text: "Produto apagado." });
  };

  const quickToggle = async (p: Product, patch: Partial<Product>, label: string) => {
    const ok = await persist({ ...p, ...patch }, p.slug);
    if (ok) setMsg({ ok: true, text: label });
  };

  async function handleFiles(files: FileList | File[]) {
    setMsg(null);
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const slug = form.slug || slugify(form.name) || "produto";
    setUploading(true);
    for (const file of arr) {
      const { url, error } = await uploadMockup(file, slug);
      if (error) {
        setMsg({
          ok: false,
          text: `Falha no upload: ${error} — rode o arquivo supabase-storage.sql no Supabase e tente de novo.`,
        });
        break;
      }
      if (url) {
        setForm((f) => ({
          ...f,
          images: [...f.images, { src: url, alt: `${f.name || "Produto"} — foto ${f.images.length + 1}` }],
        }));
      }
    }
    setUploading(false);
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm py-16">
        <h1 className="text-xl font-bold">Admin GEEKO</h1>
        <p className="mt-1 text-sm text-cream/60">Só para a equipe.</p>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (pass === (process.env.NEXT_PUBLIC_ADMIN_PASS || "geeko123")) {
                sessionStorage.setItem("geeko.admin", "1");
                setAuthed(true);
              } else alert("Senha incorreta.");
            }
          }}
          placeholder="Senha da equipe"
          className="mt-4 w-full rounded-xl border border-cream/20 bg-transparent px-4 py-3 text-sm"
        />
        <button
          onClick={() => {
            if (pass === (process.env.NEXT_PUBLIC_ADMIN_PASS || "geeko123")) {
              sessionStorage.setItem("geeko.admin", "1");
              setAuthed(true);
            } else alert("Senha incorreta.");
          }}
          className="mt-3 w-full rounded-full bg-cream py-3 text-sm font-semibold text-ink"
        >
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="py-10">
      <h1 className="text-2xl font-bold">Produtos</h1>
      <p className="mt-1 text-sm text-cream/60">
        {usingRemote
          ? "🟢 Ligado ao banco — tudo aqui vale para os 4 e para o site."
          : "🟡 Modo local — rode o SQL no Supabase para centralizar."}
      </p>
      {msg && (
        <p
          className={`mt-3 rounded-2xl border p-3 text-sm ${
            msg.ok ? "border-green-300/30 bg-green-300/10" : "border-red-300/30 bg-red-300/10"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* FORMULÁRIO */}
      <div className="mt-6 rounded-2xl border border-cream/10 bg-coal p-5">
        <p className="text-base font-semibold">{editing ? "✏️ Editar produto" : "➕ Novo produto"}</p>

        {/* FOTOS */}
        <p className="mt-4 text-sm font-semibold">1. Fotos do produto <span className="font-normal text-cream/50">(arraste para cá)</span></p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className={`mt-2 cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragOver ? "border-cream bg-cream/10" : "border-cream/25 hover:border-cream/60"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <p className="text-sm">⏳ Enviando fotos…</p>
          ) : (
            <>
              <p className="text-3xl">📸</p>
              <p className="mt-1 text-sm font-semibold">Arraste as fotos aqui ou clique para escolher</p>
              <p className="text-xs text-cream/50">JPG ou PNG até 5MB • a 1ª foto é a capa</p>
            </>
          )}
        </div>
        {form.images.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {form.images.map((img, i) => (
              <div key={img.src + i} className="relative overflow-hidden rounded-xl border border-cream/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt} className="aspect-square w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-ink">
                    CAPA
                  </span>
                )}
                <button
                  onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, x) => x !== i) }))}
                  className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs"
                  title="Remover foto"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* DADOS */}
        <p className="mt-5 text-sm font-semibold">2. Dados do produto</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })}
            placeholder="ID — ex: GKV-CAM-004"
            className="rounded-xl border border-cream/20 bg-transparent px-4 py-3 text-sm"
          />
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Título — ex: Camiseta Press Start"
            className="rounded-xl border border-cream/20 bg-transparent px-4 py-3 text-sm"
          />
        </div>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Descrição — fale da estampa, frente e verso…"
          rows={3}
          className="mt-2 w-full rounded-xl border border-cream/20 bg-transparent px-4 py-3 text-sm"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            placeholder="Preço"
            className="rounded-xl border border-cream/20 bg-transparent px-4 py-3 text-sm"
          />
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as Product["kind"] })}
            className="rounded-xl border border-cream/20 bg-ink px-4 py-3 text-sm"
          >
            <option value="camiseta">👕 Camiseta</option>
            <option value="moletom">🧥 Moletom</option>
          </select>
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Categoria"
            className="rounded-xl border border-cream/20 bg-transparent px-4 py-3 text-sm"
          />
        </div>

        {/* TAMANHOS */}
        <p className="mt-4 text-sm font-semibold">3. Tamanhos <span className="font-normal text-cream/50">(toque para ligar/desligar)</span></p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEFAULT_SIZES_TOP.map((s) => (
            <button
              key={s}
              onClick={() => setForm((f) => ({ ...f, sizes: toggle(f.sizes, s) }))}
              className={`rounded-full border px-5 py-2 text-sm font-semibold ${
                form.sizes.includes(s) ? "bg-cream text-ink border-cream" : "border-cream/25 text-cream/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* CORES */}
        <p className="mt-4 text-sm font-semibold">4. Cores <span className="font-normal text-cream/50">(toque para ligar/desligar)</span></p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  colors: f.colors.some((x) => x.id === c.id)
                    ? f.colors.filter((x) => x.id !== c.id)
                    : [...f.colors, c],
                }))
              }
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                form.colors.some((x) => x.id === c.id) ? "border-cream bg-cream/10" : "border-cream/25 text-cream/70"
              }`}
            >
              <span className="inline-block h-5 w-5 rounded-full border border-cream/40" style={{ background: c.hex }} />
              {c.name}
            </button>
          ))}
        </div>

        {/* VISIBILIDADE */}
        <p className="mt-4 text-sm font-semibold">5. Onde aparece</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => setForm((f) => ({ ...f, featured: !f.featured }))}
            className={`rounded-xl border px-4 py-3 text-left text-sm ${
              form.featured ? "border-cream bg-cream/10" : "border-cream/25"
            }`}
          >
            {form.featured ? "⭐ Na home (destaque) — toque p/ tirar" : "☆ Fora da home — toque p/ colocar"}
          </button>
          <button
            onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
            className={`rounded-xl border px-4 py-3 text-left text-sm ${
              form.active ? "border-cream bg-cream/10" : "border-cream/25"
            }`}
          >
            {form.active ? "🟢 Visível no site — toque p/ pausar" : "⏸️ Pausado — toque p/ ativar"}
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={save} className="flex-1 rounded-full bg-cream py-3 text-sm font-bold text-ink">
            {editing ? "💾 Salvar mudanças" : "➕ Adicionar produto"}
          </button>
          {editing && (
            <button
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
              className="rounded-full border border-cream/25 px-5 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* LISTA */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold">Produtos cadastrados ({items.length})</h2>
        {usingRemote && (
          <button onClick={seedExamples} className="rounded-full border border-cream/25 px-4 py-2 text-xs">
            📥 Importar exemplos
          </button>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((p) => (
          <div key={p.slug} className="rounded-2xl border border-cream/10 bg-coal p-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0]?.src ?? "/logo.jpeg"} alt={p.name} className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1 text-sm">
                <p className="text-[11px] text-cream/50">
                  {p.id} • {formatPrice(p.price)} {!p.active && "• ⏸️ pausado"} {p.featured && "• ⭐ na home"}
                </p>
                <p className="font-semibold">{p.name}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => {
                  setForm(p);
                  setEditing(p.slug);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-full border border-cream/25 px-3 py-1.5"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() =>
                  quickToggle(
                    p,
                    { featured: !p.featured },
                    p.featured ? "Tirado da home." : "Colocado na home. ⭐"
                  )
                }
                className="rounded-full border border-cream/25 px-3 py-1.5"
              >
                {p.featured ? "☆ Tirar da home" : "⭐ Pôr na home"}
              </button>
              <button
                onClick={() =>
                  quickToggle(p, { active: !p.active }, p.active ? "Produto pausado." : "Produto ativado.")
                }
                className="rounded-full border border-cream/25 px-3 py-1.5"
              >
                {p.active ? "⏸️ Pausar" : "🟢 Ativar"}
              </button>
              <button onClick={() => remove(p.slug, p.name)} className="rounded-full border border-red-300/40 px-3 py-1.5 text-red-200">
                🗑️ Apagar
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-cream/50">Nenhum produto ainda. Use o formulário acima. 👆</p>
        )}
      </div>
    </div>
  );
}
