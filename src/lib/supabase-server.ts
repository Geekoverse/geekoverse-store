import { createClient } from "@supabase/supabase-js";

/**
 * Client privilegiado (service_role) — USO EXCLUSIVO SERVER-SIDE.
 * Usado pelo webhook do Mercado Pago e pela criação de preferência
 * para ler produtos/preços autoritativos e atualizar pedidos
 * sem depender das policies públicas.
 *
 * Nunca importe este arquivo em "use client".
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseAdminConfigured = Boolean(url && serviceKey);

export const supabaseAdmin = supabaseAdminConfigured
  ? createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
