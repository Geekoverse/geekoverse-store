import { NextResponse } from "next/server";
import {
  fixedFreightForUF,
  quoteDimonaApi,
  ufFromCep,
} from "@/lib/freight";

/**
 * POST /api/freight/quote  { cep: "01310-100", quantity: 2 }
 * → { cep, uf, cheapest: {...}, options: [...], source }
 *
 * Sem DIMONA_API_KEY configurada, usa a tabela fixa (nunca trava a venda).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { cep?: string; quantity?: number };
    const cep = (body.cep ?? "").replace(/\D/g, "");
    const quantity = Math.max(1, Math.min(20, Math.floor(Number(body.quantity) || 1)));
    if (cep.length !== 8) {
      return NextResponse.json({ error: "CEP inválido. Use 8 dígitos." }, { status: 400 });
    }

    const [apiOptions, uf] = await Promise.all([
      quoteDimonaApi(cep, quantity),
      ufFromCep(cep),
    ]);

    if (apiOptions && apiOptions.length > 0) {
      return NextResponse.json({
        cep,
        uf,
        cheapest: apiOptions[0],
        options: apiOptions,
        source: "dimona-api",
      });
    }

    const fixed = fixedFreightForUF(uf ?? "XX");
    return NextResponse.json({
      cep,
      uf,
      cheapest: fixed,
      options: [fixed],
      source: "tabela-fixa",
      warning: uf
        ? "API Dimona indisponível — usando tabela fixa."
        : "CEP não localizado — usando teto de segurança (Norte).",
    });
  } catch {
    return NextResponse.json({ error: "Falha ao cotar frete." }, { status: 500 });
  }
}
