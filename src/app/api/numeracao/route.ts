import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { numeracao } from "@/db/schema";
import { CONFIG_TIPO, TIPOS_DOCUMENTO, prefixoPadrao, type Movimentacao, type TipoDocumento } from "@/lib/domain";
import { hojeISO } from "@/lib/format";
import { listarNumeracao } from "@/lib/services/documentos";
import { painelSequencia } from "@/lib/services/sequencia";
import { numeracaoInputSchema, primeiraMensagemErro } from "@/lib/validation";

export const dynamic = "force-dynamic";

function anoDe(request: NextRequest): number {
  const informado = Number(request.nextUrl.searchParams.get("ano"));
  return Number.isInteger(informado) && informado > 1990 ? informado : Number(hojeISO().slice(0, 4));
}

export async function GET(request: NextRequest) {
  const ano = anoDe(request);
  const [linhas, sequencias] = await Promise.all([listarNumeracao(ano), painelSequencia(ano)]);
  return Response.json({
    ano,
    numeracao: linhas,
    sequencias,
    chavesLegadas: linhas
      .filter((linha) => linha.chaveLegada)
      .map((linha) => ({ chave: linha.chaveLegada, movimentacao: linha.movimentacao, tipo: linha.tipo })),
  });
}

export async function PUT(request: NextRequest) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }
  const analise = numeracaoInputSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }
  const dados = analise.data;
  const [salvo] = await db
    .insert(numeracao)
    .values({
      movimentacao: dados.movimentacao as Movimentacao,
      tipo: dados.tipo as TipoDocumento,
      ano: dados.ano,
      prefixo: dados.prefixo,
      digitos: dados.digitos,
      ultimoNumero: dados.ultimoNumero,
    })
    .onConflictDoUpdate({
      target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano],
      set: {
        prefixo: dados.prefixo,
        digitos: dados.digitos,
        ultimoNumero: dados.ultimoNumero,
        atualizadoEm: new Date(),
      },
    })
    .returning();
  return Response.json({ ok: true, numeracao: salvo });
}

export async function POST(request: NextRequest) {
  /* Garante uma linha de numeração para cada movimentação + espécie no ano informado. */
  let corpo: { ano?: number } = {};
  try {
    corpo = (await request.json()) as { ano?: number };
  } catch {
    corpo = {};
  }
  const ano = Number(corpo.ano) || Number(hojeISO().slice(0, 4));

  for (const movimentacao of ["EXPEDICAO", "RECEBIMENTO"] as Movimentacao[]) {
    for (const tipo of TIPOS_DOCUMENTO) {
      const [existente] = await db
        .select({ id: numeracao.id })
        .from(numeracao)
        .where(and(eq(numeracao.movimentacao, movimentacao), eq(numeracao.tipo, tipo), eq(numeracao.ano, ano)))
        .limit(1);
      if (!existente) {
        await db.insert(numeracao).values({
          movimentacao,
          tipo,
          ano,
          prefixo: prefixoPadrao(movimentacao, tipo),
          digitos: 5,
          ultimoNumero: 0,
        });
      }
    }
  }

  const linhas = await listarNumeracao(ano);
  return Response.json({ ano, numeracao: linhas, tipos: TIPOS_DOCUMENTO.map((tipo) => CONFIG_TIPO[tipo].label) });
}
