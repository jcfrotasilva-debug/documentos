import { NextRequest } from "next/server";
import type { Movimentacao, TipoDocumento } from "@/lib/domain";
import { ajustarProximo, recalcularDoAcervo } from "@/lib/services/sequencia";
import {
  ajusteSequenciaSchema,
  primeiraMensagemErro,
  recalculoSequenciaSchema,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Define a sequência de numeração.
 *
 * POST { movimentacao, tipo, ano, proximo }            → grava proximo-1 como último emitido
 * POST { acao: "recalcular", ano, ... }                → iguala ao maior número do acervo
 */
export async function POST(request: NextRequest) {
  let corpo: Record<string, unknown> = {};
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, erro: "Corpo da requisição inválido" }, { status: 400 });
  }

  if (corpo.acao === "recalcular") {
    const analise = recalculoSequenciaSchema.safeParse(corpo);
    if (!analise.success) {
      return Response.json({ ok: false, erro: primeiraMensagemErro(analise.error) }, { status: 422 });
    }
    const resultado = await recalcularDoAcervo(
      analise.data.ano,
      analise.data.movimentacao as Movimentacao | undefined,
      analise.data.tipo as TipoDocumento | undefined,
    );
    return Response.json({
      ok: true,
      acao: "recalcular",
      ...resultado,
      mensagem:
        resultado.ajustadas === 0
          ? "Nenhum documento no acervo para este exercício: a sequência foi mantida."
          : `${resultado.ajustadas} sequência(s) igualadas ao maior número do acervo.`,
    });
  }

  const analise = ajusteSequenciaSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ ok: false, erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }

  const dados = analise.data;
  const resultado = await ajustarProximo(
    dados.movimentacao as Movimentacao,
    dados.tipo as TipoDocumento,
    dados.ano,
    dados.proximo,
    dados.confirmarDuplicidade ?? false,
  );

  if (!resultado.ok) {
    return Response.json({ ok: false, erro: resultado.aviso, linha: resultado.linha }, { status: 409 });
  }

  return Response.json({
    ok: true,
    acao: "definir",
    linha: resultado.linha,
    aviso: resultado.aviso,
    mensagem: `Próximo ${resultado.linha.prefixo} será ${resultado.numeroAjustado}.`,
  });
}
