/**
 * Cliente mínimo do Mercado Pago via fetch (sem SDK).
 * Evita dependência nova e mantém o backend enxuto.
 *
 * SANDBOX / TESTE:
 *  - Funciona com token de TESTE (prefixo TEST-) e de PRODUÇÃO (APP_USR-).
 *    O host é o mesmo (api.mercadopago.com); o token define o ambiente.
 *  - Para testar local: use o token TEST-, um usuário de teste como comprador
 *    e exponha o localhost com ngrok/cloudflared para o webhook chegar
 *    (o MP não alcança http://localhost:3000 diretamente).
 *  - A preferência devolve `sandbox_init_point` quando criada com token TEST-;
 *    use esse link nos testes (o `init_point` de teste redireciona igual).
 */

const MP_API = "https://api.mercadopago.com";

function accessToken() {
  const t = (process.env.MP_ACCESS_TOKEN ?? "").trim();
  if (!t)
    throw new Error(
      "MP_ACCESS_TOKEN não configurado no servidor. Use o token TEST- para sandbox ou APP_USR- para produção."
    );
  return t;
}

/** true quando o token é de teste (sandbox). Útil para logs e init_point. */
export function isSandboxToken(token?: string) {
  const t = (token ?? process.env.MP_ACCESS_TOKEN ?? "").trim();
  return t.startsWith("TEST-") || t.startsWith("test_");
}

/** "sandbox" | "production" — apenas informativo (mesmo host, muda o token). */
export function mpEnv(): "sandbox" | "production" {
  return isSandboxToken() ? "sandbox" : "production";
}

export type MPPreferenceItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  description?: string;
};

export type CreatePreferenceInput = {
  orderId: string;
  items: MPPreferenceItem[];
  payer: { name?: string; email?: string; phone?: string };
  freight?: number;
  notificationUrl: string;
  backUrls?: { success?: string; failure?: string; pending?: string };
  autoReturn?: "approved" | "all";
};

/** Cria a preferência de checkout e devolve init_point + id.
 * Com token TEST- (sandbox), prefira `sandbox_init_point` para pagar como
 * usuário de teste. Em produção (APP_USR-), use `init_point`. */
export async function createMPPreference(input: CreatePreferenceInput): Promise<{
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}> {
  const body = {
    external_reference: input.orderId,
    items: input.items.map((i) => ({
      title: i.title.slice(0, 200),
      quantity: Math.max(1, Math.floor(i.quantity)),
      unit_price: Number(i.unit_price),
      currency_id: i.currency_id ?? "BRL",
      ...(i.description ? { description: i.description.slice(0, 200) } : {}),
    })),
    payer: {
      ...(input.payer.name ? { name: input.payer.name } : {}),
      ...(input.payer.email ? { email: input.payer.email } : {}),
    },
    shipments:
      input.freight && input.freight > 0
        ? { cost: Number(input.freight), mode: "not_specified" }
        : undefined,
    metadata: { geeko_order_id: input.orderId },
    notification_url: input.notificationUrl,
    back_urls: input.backUrls,
    auto_return: input.backUrls?.success ? input.autoReturn ?? "approved" : undefined,
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao criar preferência MP (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as {
    id: string;
    init_point: string;
    sandbox_init_point?: string;
  };
}

export type MPPayment = {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  metadata?: Record<string, unknown>;
  payer?: { email?: string; first_name?: string; last_name?: string };
  transaction_amount?: number;
  date_approved?: string | null;
};

/** Busca o pagamento pelo ID vindo no webhook. Fonte da verdade do status.
 * Vale para sandbox e produção — o token de MP_ACCESS_TOKEN define o ambiente. */
export async function getMPPayment(paymentId: string): Promise<MPPayment> {
  const res = await fetch(
    `${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken()}` },
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao consultar pagamento MP (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as MPPayment;
}
