/**
 * Cliente da API de produção da Dimona (Dropsimples).
 *
 * Contrato oficial: https://api.camisadimona.com.br/
 * Configuração da chave: camisadimona.com.br > conta > Avançado > API Key.
 * Dúvidas de SKU/estampa: api@dimona.com.br
 *
 * FLUXO DE PAGAMENTO MANUAL (definição do lojista):
 *  - Este módulo envia o pedido APENAS para registro no painel Dropsimples.
 *  - NENHUM dado de cartão/PIX/cobrança é enviado. Nenhuma captura automática
 *    é disparada. O pedido entra com status "Aguardando Pagamento" (padrão da
 *    Dimona para pedidos via API) e a equipe paga no fim do dia pelo painel
 *    (PIX/boleto/cartão), liberando a produção.
 *  - Se um dia quiser débito automático, crie outro builder — nunca altere
 *    este para cobrar sem revisão.
 *
 * O que este módulo faz:
 *  - resolve o SKU Dimona de cada item (mapa por tamanho/cor → fallback dimona_sku)
 *  - monta o payload com SKU base + URL da estampa (PNG alta, pública)
 *  - dispara POST autenticado e devolve o id do pedido na Dimona
 *
 * IMPORTANTE: nomes de campos do payload seguem o padrão documentado na
 * API V2. Se a sua conta usar nomenclatura diferente (ex: "print_url" vs
 * "art_url"), ajuste apenas o builder abaixo ou a env
 * DIMONA_ORDERS_PATH — o resto do fluxo (MP → Supabase → Dimona) não muda.
 */

const BASE =
  process.env.DIMONA_API_BASE_URL ?? "https://admin.camisadimona.com.br";
// Permite trocar o path sem mexer em código (ex: /api/v2/dropshipping/orders)
const ORDERS_PATH = process.env.DIMONA_ORDERS_PATH ?? "/api/v2/orders";

function apiKey() {
  const k = process.env.DIMONA_API_KEY ?? "";
  if (!k) throw new Error("DIMONA_API_KEY não configurada no servidor.");
  return k;
}

function headers() {
  const key = apiKey();
  return {
    // A Dimona V2 autentica via header "api-key" (usado no frete).
    // Enviamos também Bearer por compatibilidade com contas Dropsimples novas.
    "api-key": key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export type DimonaOrderItemInput = {
  product_slug: string;
  product_name: string;
  size: string;
  color_id: string;
  color_name: string;
  quantity: number;
  /** SKU resolvido (variante ou base). */
  dimona_sku: string;
  /** URL pública do PNG em alta. */
  print_art_url: string;
};

export type DimonaOrderInput = {
  orderId: string;
  customer: { name: string; email: string; phone: string; cpf?: string };
  shipping: {
    zipcode: string;
    street: string;
    number: string;
    complement?: string;
    district?: string;
    city: string;
    state: string;
  };
  items: DimonaOrderItemInput[];
};

/** Chave do mapa de variantes: "TAMANHO:corId" — ex: "G:preta". */
export function variantKey(size: string, colorId: string) {
  return `${String(size).toUpperCase().trim()}:${String(colorId).toLowerCase().trim()}`;
}

/**
 * Resolve o SKU Dimona de um item:
 * 1º tenta dimona_variant_skus["G:preta"]
 * 2º tenta dimona_variant_skus["G"] (só tamanho)
 * 3º usa dimona_sku (base)
 */
export function resolveDimonaSku(
  size: string,
  colorId: string,
  baseSku: string,
  variantMap?: Record<string, string> | null
): string {
  const map = variantMap ?? {};
  return (
    map[variantKey(size, colorId)] ??
    map[String(size).toUpperCase().trim()] ??
    baseSku ??
    ""
  );
}

/**
 * Monta o payload de pedido customizado da Dimona — MODO MANUAL.
 * Passa DINAMICAMENTE o SKU base + URL da estampa de cada item,
 * exatamente como a Dimona exige para estampas dinâmicas (PNG 200–300 DPI).
 *
 * PAGAMENTO: nenhum campo de cobrança é enviado (sem cartão, sem PIX,
 * sem capture/charge). Os flags abaixo apenas REFORÇAM a intenção de
 * "aguardando pagamento manual"; a Dimona ignora flags desconhecidos e,
 * por padrão, todo pedido via API já entra como "Aguardando Pagamento"
 * até ser pago no painel do lojista.
 */
export function buildDimonaOrderPayload(input: DimonaOrderInput) {
  const items = input.items.map((it) => ({
    // SKU da peça base na Dimona (cor + modelo + tamanho)
    sku: it.dimona_sku,
    product_ref: it.product_slug,
    description: `${it.product_name} — ${it.size} / ${it.color_name}`,
    size: it.size,
    color: it.color_name,
    quantity: it.quantity,
    // Estampa dinâmica: a Dimona baixa este PNG na produção
    print_url: it.print_art_url,
    art_url: it.print_art_url,
    customization: {
      sku: it.dimona_sku,
      print_url: it.print_art_url,
    },
  }));

  return {
    external_reference: input.orderId,
    order_reference: input.orderId,
    // --- Pagamento MANUAL: pedido entra "Aguardando Pagamento" no painel ---
    // Nenhuma cobrança automática. A equipe paga via PIX no fim do dia.
    status: "awaiting_payment",
    payment_status: "pending",
    paid: false,
    auto_charge: false,
    capture: false,
    payment_method: "manual",
    notes: `Pedido ${input.orderId} via site — aguardando pagamento manual (PIX) no painel.`,
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      ...(input.customer.cpf ? { cpf: input.customer.cpf } : {}),
    },
    shipping_address: {
      zipcode: input.shipping.zipcode.replace(/\D/g, ""),
      street: input.shipping.street,
      number: input.shipping.number,
      complement: input.shipping.complement ?? "",
      district: input.shipping.district ?? "",
      city: input.shipping.city,
      state: input.shipping.state,
    },
    items,
  };
}

/**
 * Dispara o pedido para a Dimona APENAS para registro.
 * Não cobra nada: o pedido cai no painel como "Aguardando Pagamento".
 * Retorna o JSON bruto + id do pedido na Dimona.
 */
export async function createDimonaOrder(
  input: DimonaOrderInput
): Promise<{ orderId: string | null; raw: unknown }> {
  const payload = buildDimonaOrderPayload(input);

  const res = await fetch(`${BASE}${ORDERS_PATH}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  const raw: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      `Dimona recusou o pedido (${res.status}): ${JSON.stringify(raw)?.slice(0, 500)}`
    );
  }

  const obj = (raw ?? {}) as Record<string, unknown>;
  const orderId =
    (obj["order_id"] as string) ??
    (obj["id"] as string) ??
    (obj["orderId"] as string) ??
    (obj["pedido_id"] as string) ??
    null;

  return { orderId: orderId ? String(orderId) : null, raw };
}
