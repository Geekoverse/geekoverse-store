import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getMPPayment, mpEnv } from "@/lib/mercadopago";
import { createDimonaOrder } from "@/lib/dimona";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/mercadopago
 * Recebe notificações de pagamento do Mercado Pago (SANDBOX e PRODUÇÃO).
 * O token em MP_ACCESS_TOKEN define o ambiente: TEST- = sandbox,
 * APP_USR- = produção. O host e a validação HMAC são os mesmos.
 *
 * Quando status === "approved": busca o pedido no Supabase
 * (endereço + itens com dimona_sku + print_art_url) e registra o pedido
 * na Dimona como "Aguardando Pagamento" (pagamento MANUAL via PIX no painel).
 *
 * Teste local: o MP não alcança http://localhost:3000. Exponha com
 * ngrok (ex: ngrok http 3000) e cadastre a URL pública no painel do MP
 * (Sua integração > Webhooks) + NEXT_PUBLIC_SITE_URL com essa URL.
 *
 * Segurança: valida x-signature (HMAC-SHA256) quando
 * MP_WEBHOOK_SECRET está configurado (vale p/ teste e produção).
 * Resiliência: responde 200 rápido (o MP reenvia a cada 15min se não
 * responder em ~22s) e é idempotente via webhook_events + dimona_status.
 */

function validateSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET ?? "";
  // Sem secret configurado: aceita (modo dev) mas loga alerta.
  // Em produção, configure MP_WEBHOOK_SECRET no painel do MP + Vercel.
  if (!secret) {
    console.warn("[mp-webhook] MP_WEBHOOK_SECRET ausente — pulando validação HMAC.");
    return true;
  }
  if (!xSignature || !xRequestId) return false;
  try {
    const parts = Object.fromEntries(
      xSignature.split(",").map((p) => {
        const [k, ...rest] = p.split("=");
        return [k.trim(), rest.join("=").trim()];
      })
    );
    const ts = parts["ts"];
    const received = parts["v1"];
    if (!ts || !received) return false;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = createHmac("sha256", secret).update(manifest).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(received, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type MPWebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

export async function POST(req: Request) {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  let body: MPWebhookBody;
  try {
    body = (await req.json()) as MPWebhookBody;
  } catch {
    return NextResponse.json({ received: true });
  }

  const dataId = body?.data?.id ? String(body.data.id) : "";
  const isPaymentEvent =
    body?.type === "payment" || (body?.action ?? "").startsWith("payment.");

  // Confirma recebimento de eventos que não são de pagamento
  if (!isPaymentEvent || !dataId) return NextResponse.json({ received: true });

  if (!validateSignature(xSignature, xRequestId, dataId)) {
    console.error("[mp-webhook] assinatura inválida.");
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  // Log do ambiente (sandbox = token TEST-). Não bloqueia nada.
  try {
    console.log(`[mp-webhook] evento payment ${dataId} recebido (mp_env=${mpEnv()}).`);
  } catch {}

  // Responde 200 IMEDIATAMENTE e processa em background.
  // (O MP dá ~22s; processamento Dimona pode passar disso.)
  processPaymentAsync(dataId).catch((e) =>
    console.error("[mp-webhook] falha async:", e)
  );
  return NextResponse.json({ received: true });
}

async function processPaymentAsync(paymentId: string) {
  if (!supabaseAdminConfigured || !supabaseAdmin) {
    console.error("[mp-webhook] SUPABASE_SERVICE_ROLE_KEY ausente.");
    return;
  }
  const db = supabaseAdmin;

  // Idempotência: ignora evento já processado
  const { data: seen } = await db
    .from("webhook_events")
    .select("id,processed")
    .eq("source", "mercadopago")
    .eq("resource_id", paymentId)
    .maybeSingle();
  if (seen?.processed) {
    console.log(`[mp-webhook] pagamento ${paymentId} já processado — skip.`);
    return;
  }
  await db.from("webhook_events").upsert(
    {
      source: "mercadopago",
      event_type: "payment",
      resource_id: paymentId,
      payload: { paymentId },
      processed: false,
    },
    { onConflict: "source,resource_id" }
  );

  // Fonte da verdade: consulta o pagamento na API do MP
  const payment = await getMPPayment(paymentId);
  const approved =
    payment.status === "approved" || payment.date_approved != null;

  await db
    .from("webhook_events")
    .update({ payload: JSON.parse(JSON.stringify(payment)) })
    .eq("source", "mercadopago")
    .eq("resource_id", paymentId);

  // Descobre o pedido: external_reference → metadata → payer
  const orderId =
    (payment.external_reference as string | null) ??
    ((payment.metadata as Record<string, unknown> | undefined)?.[
      "geeko_order_id"
    ] as string | undefined) ??
    null;

  if (!orderId) {
    await db
      .from("webhook_events")
      .update({ error: "sem external_reference", processed: true })
      .eq("source", "mercadopago")
      .eq("resource_id", paymentId);
    console.error(`[mp-webhook] pagamento ${paymentId} sem external_reference.`);
    return;
  }

  await db
    .from("orders")
    .update({ mp_payment_id: String(payment.id), mp_status: payment.status })
    .eq("id", orderId);

  if (!approved) {
    await db
      .from("webhook_events")
      .update({ processed: true })
      .eq("source", "mercadopago")
      .eq("resource_id", paymentId);
    console.log(`[mp-webhook] pagamento ${paymentId} status=${payment.status} — aguarda aprovação.`);
    return;
  }

  // Idempotência de produção: não reenvia se já foi para a Dimona
  const { data: order } = await db.from("orders").select("*").eq("id", orderId).single();
  if (!order) {
    console.error(`[mp-webhook] pedido ${orderId} não encontrado.`);
    return;
  }
  if ((order as { dimona_status?: string }).dimona_status === "sent") {
    await db
      .from("webhook_events")
      .update({ processed: true })
      .eq("source", "mercadopago")
      .eq("resource_id", paymentId);
    console.log(`[mp-webhook] pedido ${orderId} já enviado à Dimona — skip.`);
    return;
  }

  // Recupera os detalhes do pedido: envio + produtos + dimona_sku + artes
  const { data: items, error: itemsErr } = await db
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsErr || !items || items.length === 0) {
    const msg = itemsErr?.message ?? "pedido sem itens";
    await db.from("orders").update({ dimona_status: "error", dimona_error: msg }).eq("id", orderId);
    await db.from("webhook_events").update({ error: msg, processed: true })
      .eq("source", "mercadopago").eq("resource_id", paymentId);
    return;
  }

  const o = order as {
    customer_name: string; customer_email: string; customer_phone: string; customer_cpf: string;
    ship_zipcode: string; ship_street: string; ship_number: string;
    ship_complement: string; ship_district: string; ship_city: string; ship_uf: string;
  };
  const rows = items as {
    product_slug: string; product_name: string; size: string;
    color_id: string; color_name: string; quantity: number;
    dimona_sku: string; print_art_url: string;
  }[];

  for (const it of rows) {
    if (!it.dimona_sku || !it.print_art_url) {
      const msg = `Item "${it.product_name}" sem dimona_sku ou print_art_url. Complete no /admin e reenvie.`;
      await db.from("orders").update({ dimona_status: "error", dimona_error: msg }).eq("id", orderId);
      await db.from("webhook_events").update({ error: msg, processed: true })
        .eq("source", "mercadopago").eq("resource_id", paymentId);
      console.error(`[mp-webhook] ${msg}`);
      return;
    }
  }

  const payloadPreview = {
    orderId,
    customer: { name: o.customer_name, email: o.customer_email, phone: o.customer_phone, cpf: o.customer_cpf || undefined },
    shipping: {
      zipcode: o.ship_zipcode, street: o.ship_street, number: o.ship_number,
      complement: o.ship_complement, district: o.ship_district, city: o.ship_city, state: o.ship_uf,
    },
    items: rows.map((it) => ({
      product_slug: it.product_slug, product_name: it.product_name,
      size: it.size, color_id: it.color_id, color_name: it.color_name,
      quantity: it.quantity, dimona_sku: it.dimona_sku, print_art_url: it.print_art_url,
    })),
  };

  await db.from("orders").update({ dimona_status: "sending", dimona_payload: payloadPreview }).eq("id", orderId);

  try {
    // Registro na Dimona como AGUARDANDO PAGAMENTO — pagamento MANUAL via PIX no painel.
    const result = await createDimonaOrder(payloadPreview);
    await db.from("orders").update({
      dimona_status: "sent",
      dimona_order_id: result.orderId,
      dimona_response: JSON.parse(JSON.stringify(result.raw)),
      dimona_error: null,
    }).eq("id", orderId);
    await db.from("webhook_events").update({ processed: true, error: null })
      .eq("source", "mercadopago").eq("resource_id", paymentId);
    console.log(`[mp-webhook] pedido ${orderId} → Dimona ${result.orderId ?? "(sem id)"} OK.`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falha Dimona";
    await db.from("orders").update({ dimona_status: "error", dimona_error: msg }).eq("id", orderId);
    // processed=false → permite retry manual ou reprocessamento via reenvio do MP
    await db.from("webhook_events").update({ error: msg, processed: false })
      .eq("source", "mercadopago").eq("resource_id", paymentId);
    console.error(`[mp-webhook] Dimona falhou p/ pedido ${orderId}: ${msg}`);
  }
}
