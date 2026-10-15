import { NextRequest } from "next/server";
import { alterarStatus } from "@/lib/services/documentos";
import type { StatusDocumento } from "@/lib/domain";
import { movimentoInputSchema, primeiraMensagemErro } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId)) return Response.json({ erro: "Identificador inválido" }, { status: 400 });

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }

  const analise = movimentoInputSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }

  const atualizado = await alterarStatus(
    numeroId,
    analise.data.status as StatusDocumento,
    analise.data.descricao,
    analise.data.usuario || "Usuário do sistema",
  );
  if (!atualizado) return Response.json({ erro: "Documento não encontrado" }, { status: 404 });
  return Response.json({ ok: true, documento: atualizado });
}
