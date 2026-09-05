/**
 * Frete Geeko — Dimona
 *
 * Estratégia em 2 níveis (recomendação oficial da Dimona):
 *  1. API Dimona (POST /api/v2/shipping) — valor exato por produto + CEP.
 *     Ativa quando DIMONA_API_KEY está configurada (server-side apenas).
 *  2. Tabela fixa por região — fallback calibrável, nunca trava a venda.
 *
 * IMPORTANTE: os valores da tabela fixa são PLACEHOLDERS.
 * Calibre com simulações no site da Dimona (peça mais pesada x CEPs extremos)
 * e edite abaixo ou via env DIMONA_FREIGHT_*.
 */

export type FreightOption = {
  name: string;
  value: number;
  businessDays: number;
  deliveryMethodId?: number;
  source: "dimona-api" | "tabela-fixa";
};

const DIMONA_API_BASE =
  process.env.DIMONA_API_BASE_URL ?? "https://api.camisadimona.com.br";
const DIMONA_API_KEY = process.env.DIMONA_API_KEY ?? "";

// Tabela fixa de SEGURANÇA (teto conservador) — calibre com simulações reais.
// Ordem: Sudeste, Sul, Centro-Oeste, Nordeste, Norte (= teto geral).
function fixedTable(): Record<string, number> {
  const env = (k: string, fallback: number) => {
    const v = Number(process.env[k]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return {
    SUDESTE: env("DIMONA_FREIGHT_SUDESTE", 19.9),
    SUL: env("DIMONA_FREIGHT_SUL", 24.9),
    CENTRO_OESTE: env("DIMONA_FREIGHT_CENTRO_OESTE", 24.9),
    NORDESTE: env("DIMONA_FREIGHT_NORDESTE", 34.9),
    NORTE: env("DIMONA_FREIGHT_NORTE", 39.9),
  };
}

const UF_REGION: Record<string, keyof ReturnType<typeof fixedTable>> = {
  SP: "SUDESTE",
  RJ: "SUDESTE",
  MG: "SUDESTE",
  ES: "SUDESTE",
  PR: "SUL",
  SC: "SUL",
  RS: "SUL",
  MT: "CENTRO_OESTE",
  MS: "CENTRO_OESTE",
  GO: "CENTRO_OESTE",
  DF: "CENTRO_OESTE",
  BA: "NORDESTE",
  SE: "NORDESTE",
  AL: "NORDESTE",
  PE: "NORDESTE",
  PB: "NORDESTE",
  RN: "NORDESTE",
  CE: "NORDESTE",
  PI: "NORDESTE",
  MA: "NORDESTE",
  TO: "NORTE",
  PA: "NORTE",
  AP: "NORTE",
  AM: "NORTE",
  RR: "NORTE",
  RO: "NORTE",
  AC: "NORTE",
};

export function regionForUF(uf: string) {
  return UF_REGION[uf.toUpperCase()] ?? "NORTE"; // UF desconhecida = teto (seguro)
}

export function fixedFreightForUF(uf: string): FreightOption {
  const table = fixedTable();
  const region = regionForUF(uf);
  return {
    name: `Fixa ${region}`,
    value: table[region],
    businessDays: 12,
    source: "tabela-fixa",
  };
}

type DimonaQuoteItem = {
  name: string;
  value: number;
  business_days: number;
  delivery_method_id: number;
};

/** Consulta exata à API Dimona. Retorna opções ordenadas (mais barata primeiro). */
export async function quoteDimonaApi(
  cep: string,
  quantity: number
): Promise<FreightOption[] | null> {
  if (!DIMONA_API_KEY) return null;
  try {
    const res = await fetch(`${DIMONA_API_BASE}/api/v2/shipping`, {
      method: "POST",
      headers: {
        "api-key": DIMONA_API_KEY,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zipcode: cep.replace(/\D/g, ""), quantity: String(quantity) }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DimonaQuoteItem[];
    if (!Array.isArray(data) || data.length === 0) return null;
    return data
      .map((q) => ({
        name: q.name,
        value: Number(q.value),
        businessDays: Number(q.business_days),
        deliveryMethodId: Number(q.delivery_method_id),
        source: "dimona-api" as const,
      }))
      .filter((q) => Number.isFinite(q.value) && q.value > 0)
      .sort((a, b) => a.value - b.value);
  } catch {
    return null;
  }
}

/** ViaCEP (grátis, sem chave) — resolve UF a partir do CEP. */
export async function ufFromCep(cep: string): Promise<string | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { uf?: string; erro?: boolean };
    if (data.erro || !data.uf) return null;
    return data.uf;
  } catch {
    return null;
  }
}
