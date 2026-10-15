import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { responsaveis } from "@/db/schema";
import {
  importarResponsaveisDoAcervo,
  listarResponsaveis,
  atualizarResponsavel,
  criarResponsavel,
} from "@/lib/services/responsaveis";
import { ehViolacaoUnicidade, textoDoErro } from "@/lib/erros";
import { primeiraMensagemErro, responsavelInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const lista = await listarResponsaveis();
  return Response.json({ responsaveis: lista });
}

export async function POST(request: NextRequest) {
  let corpo: Record<string, unknown> = {};
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }

  /* Importa como responsáveis os nomes que já assinam documentos no acervo. */
  if (corpo.acao === "importar-do-acervo") {
    const resultado = await importarResponsaveisDoAcervo();
    return Response.json({
      ok: true,
      ...resultado,
      mensagem:
        resultado.criados === 0
          ? "Todos os responsáveis do acervo já estavam cadastrados."
          : `${resultado.criados} responsável(is) importado(s) do acervo.`,
    });
  }

  const analise = responsavelInputSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }

  try {
    const criado = await criarResponsavel(analise.data);
    return Response.json({ ok: true, responsavel: criado }, { status: 201 });
  } catch (erro) {
    if (ehViolacaoUnicidade(erro, ["responsaveis_nome_idx", "responsaveis"])) {
      return Response.json({ erro: "Já existe um responsável com este nome." }, { status: 409 });
    }
    return Response.json({ erro: textoDoErro(erro) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let corpo: { id?: number; sincronizar?: boolean } & Record<string, unknown>;
  try {
    corpo = (await request.json()) as { id?: number; sincronizar?: boolean } & Record<string, unknown>;
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }

  const id = Number(corpo.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ erro: "Identificador inválido" }, { status: 400 });
  }

  const analise = responsavelInputSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }

  try {
    const resultado = await atualizarResponsavel(id, analise.data, corpo.sincronizar !== false);
    if (!resultado) return Response.json({ erro: "Responsável não encontrado" }, { status: 404 });
    return Response.json({
      ok: true,
      responsavel: resultado.registro,
      documentosAtualizados: resultado.documentosAtualizados,
      mensagem:
        resultado.documentosAtualizados > 0
          ? `Dados atualizados e ${resultado.documentosAtualizados} documento(s) do acervo sincronizado(s).`
          : "Responsável atualizado.",
    });
  } catch (erro) {
    if (ehViolacaoUnicidade(erro, ["responsaveis_nome_idx", "responsaveis"])) {
      return Response.json({ erro: "Já existe um responsável com este nome." }, { status: 409 });
    }
    return Response.json({ erro: textoDoErro(erro) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ erro: "Identificador inválido" }, { status: 400 });
  }
  const [removido] = await db.delete(responsaveis).where(eq(responsaveis.id, id)).returning();
  if (!removido) return Response.json({ erro: "Responsável não encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
