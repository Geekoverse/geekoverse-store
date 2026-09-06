import { NextResponse } from "next/server";
import { createMPPreference } from "@/lib/mercadopago";
import { resolveDimonaSku } from "@/lib/dimona";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-server";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/checkout/create-preference
 * Body: {
 *   items: [{ slug, size, colorId, quantity }],
 *   customer: { name, email, phone, cpf? },
 *   shipping: { zipcode, street, number, complement?, district?, city, uf }
 * }
 * → { orderId, init_point, preferenceId }
 *
 * Fluxo: valida → busca preço + dimona_sku + print_art_url autoritativos
 * no Supabase → congela snapshot em orders/order_items → cria preferência MP
 * com external_reference = orderId → front redireciona ao init_point.
 */

type InItem = { slug: string; size: string; colorId?: string; quantity?: number };
type Body = {
  items?: InItem[];
  customer?: { name?: string; email?: string; phone?: string; cpf?: string };
  shipping?: {
    zipcode?: string;
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    uf?: string;
  };
};

function siteUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const items = body.items ?? [];
    const customer = {
      name: (body.customer?.name ?? "").trim(),
      email: (body.customer?.email ?? "").trim(),
      phone: (body.customer?.phone ?? "").replace(/\D/g, ""),
      cpf: (body.customer?.cpf ?? "").replace(/\D/g, ""),
    };
    const shipping = {
      zipcode: (body.shipping?.zipcode ?? "").replace(/\D/g, ""),
      street: (body.shipping?.street ?? "").trim(),
      number: (body.shipping?.number ?? "").trim(),
      complement: (body.shipping?.complement ?? "").trim(),
      district: (body.shipping?.district ?? "").trim(),
      city: (body.shipping?.city ?? "").trim(),
      uf: (body.shipping?.uf ?? "").toUpperCase().trim(),
    };

    if (items.length === 0)
      return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
    if (!customer.name || !customer.email || customer.phone.length < 10)
      return NextResponse.json(
        { error: "Informe nome, e-mail e WhatsApp com DDD." },
        { status: 400 }
      );
    if (
      shipping.zipcode.length !== 8 ||
      !shipping.street ||
      !shipping.number ||
      !shipping.city ||
      shipping.uf.length !== 2
    )
      return NextResponse.json(
        { error: "Endereço incompleto (rua, número, cidade, UF e CEP)." },
        { status: 400 }
      );

    // Busca autoritativa dos produtos (preço + dados Dimona) — nunca confia no front
    const slugs = Array.from(new Set(items.map((i) => i.slug)));
    const db = supabaseAdminConfigured ? supabaseAdmin : supabaseConfigured ? supabase : null;
    if (!db)
      return NextResponse.json({ error: "Banco não configurado." }, { status: 500 });

    const { data: rows, error: prodErr } = await db
      .from("products")
      .select("slug,name,price,active,dimona_sku,print_art_url,dimona_variant_skus,colors")
      .in("slug", slugs);

    if (prodErr)
      return NextResponse.json({ error: `Falha ao ler produtos: ${prodErr.message}` }, { status: 500 });

    const bySlug = new Map((rows ?? []).map((r) => [r.slug as string, r]));

    type SnapItem = {
      slug: string; name: string; size: string;
      colorId: string; colorName: string; quantity: number;
      unitPrice: number; dimonaSku: string; printArtUrl: string;
    };
    const snap: SnapItem[] = [];

    for (const it of items) {
      const r = bySlug.get(it.slug) as unknown as
        | {
            slug: string; name: string; price: number | string; active: boolean;
            dimona_sku?: string | null; print_art_url?: string | null;
            dimona_variant_skus?: Record<string, string> | null;
            colors?: { id: string; name: string }[] | null;
          }
        | undefined;
      if (!r || r.active === false)
        return NextResponse.json({ error: `Produto indisponível: ${it.slug}.` }, { status: 400 });

      const qty = Math.max(1, Math.min(20, Math.floor(Number(it.quantity) || 1)));
      const size = String(it.size ?? "G").toUpperCase();
      const colorId = String(it.colorId ?? "preta").toLowerCase();
      const colorName =
        r.colors?.find((c) => c.id.toLowerCase() === colorId)?.name ?? colorId;

      const dimonaSku = resolveDimonaSku(
        size, colorId, (r.dimona_sku ?? "").trim(),
        (r.dimona_variant_skus as Record<string, string> | null) ?? {}
      );
      if (!dimonaSku)
        return NextResponse.json(
          { error: `Produto "${r.name}" sem SKU Dimona. Cadastre no /admin antes de vender.` },
          { status: 400 }
        );
      const art = (r.print_art_url ?? "").trim();
      if (!art)
        return NextResponse.json(
          { error: `Produto "${r.name}" sem arte PNG. Cadastre o link da estampa no /admin.` },
          { status: 400 }
        );

      snap.push({
        slug: r.slug, name: r.name, size, colorId, colorName,
        quantity: qty, unitPrice: Number(r.price) || 0,
        dimonaSku, printArtUrl: art,
      });
    }

    const subtotal = snap.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    // Frete: tenta a API Dimona exata, senão usa a tabela fixa (nunca trava a venda)
    let freight = 0;
    try {
      const { quoteDimonaApi, fixedFreightForUF } = await import("@/lib/freight");
      const totalQty = snap.reduce((s, i) => s + i.quantity, 0);
      const apiOpts = await quoteDimonaApi(shipping.zipcode, totalQty);
      freight = apiOpts?.[0]?.value ?? fixedFreightForUF(shipping.uf).value;
    } catch {
      freight = 19.9;
    }

    if (!supabaseAdminConfigured || !supabaseAdmin)
      return NextResponse.json(
        { error: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para criar pedidos." },
        { status: 500 }
      );

    // Cria o pedido como pending
    const { data: order, error: ordErr } = await supabaseAdmin
      .from("orders")
      .insert({
        mp_status: "pending",
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_cpf: customer.cpf,
        ship_zipcode: shipping.zipcode,
        ship_street: shipping.street,
        ship_number: shipping.number,
        ship_complement: shipping.complement,
        ship_district: shipping.district,
        ship_city: shipping.city,
        ship_uf: shipping.uf,
        subtotal,
        freight,
        total_amount: subtotal + freight,
        dimona_status: "pending",
      })
      .select("id")
      .single();

    if (ordErr || !order)
      return NextResponse.json({ error: `Falha ao salvar pedido: ${ordErr?.message}` }, { status: 500 });

    const orderId = (order as { id: string }).id;

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      snap.map((i) => ({
        order_id: orderId,
        product_slug: i.slug,
        product_name: i.name,
        size: i.size,
        color_id: i.colorId,
        color_name: i.colorName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        dimona_sku: i.dimonaSku,
        print_art_url: i.printArtUrl,
      }))
    );
    if (itemsErr) {
      await supabaseAdmin.from("orders").update({ error: itemsErr.message }).eq("id", orderId);
      return NextResponse.json({ error: `Falha ao salvar itens: ${itemsErr.message}` }, { status: 500 });
    }

    // Cria a preferência no Mercado Pago
    const origin = siteUrl(req);
    const pref = await createMPPreference({
      orderId,
      items: snap.map((i) => ({
        title: `${i.name} — ${i.size}/${i.colorName}`,
        quantity: i.quantity,
        unit_price: Number((i.unitPrice + freight / snap.reduce((s, x) => s + x.quantity, 0)).toFixed(2)),
        description: i.slug,
      })),
      payer: { name: customer.name, email: customer.email, phone: customer.phone },
      notificationUrl: `${origin}/api/webhooks/mercadopago`,
      backUrls: {
        success: `${origin}/pedido/${orderId}?status=approved`,
        failure: `${origin}/pedido/${orderId}?status=failure`,
        pending: `${origin}/pedido/${orderId}?status=pending`,
      },
      autoReturn: "approved",
    });

    await supabaseAdmin
      .from("orders")
      .update({ mp_preference_id: pref.id, mp_external_reference: orderId })
      .eq("id", orderId);

    return NextResponse.json({ orderId, preferenceId: pref.id, init_point: pref.init_point });
  } catch (e) {
    console.error("[checkout] erro:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao criar checkout." },
      { status: 500 }
    );
  }
}
