import { NextRequest } from "next/server";
import { atualizarDocumento, buscarDocumento, excluirDocumento } from "@/lib/services/documentos";
import { documentoInputSchema, primeiraMensagemErro } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId)) return Response.json({ erro: "Identificador inválido" }, { status: 400 });
  const registro = await buscarDocumento(numeroId);
  if (!registro) return Response.json({ erro: "Documento não encontrado" }, { status: 404 });
  return Response.json(registro);
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId)) return Response.json({ erro: "Identificador inválido" }, { status: 400 });

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }

  const analise = documentoInputSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }

  try {
    const atualizado = await atualizarDocumento(numeroId, analise.data, analise.data.criadoPor || "Usuário do sistema");
    if (!atualizado) return Response.json({ erro: "Documento não encontrado" }, { status: 404 });
    return Response.json({ ok: true, documento: atualizado });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao atualizar documento";
    if (mensagem.includes("documentos_numero_idx")) {
      return Response.json({ erro: "Já existe um documento com este número." }, { status: 409 });
    }
    return Response.json({ erro: mensagem }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId)) return Response.json({ erro: "Identificador inválido" }, { status: 400 });
  const removido = await excluirDocumento(numeroId);
  if (!removido) return Response.json({ erro: "Documento não encontrado" }, { status: 404 });
  return Response.json({ ok: true, numero: removido.numero });
}
