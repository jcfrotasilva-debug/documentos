import { NextRequest } from "next/server";
import { excluirResponsavel } from "@/lib/services/responsaveis";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  void request;
  const { id } = await params;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId) || numeroId <= 0) {
    return Response.json({ erro: "Identificador inválido" }, { status: 400 });
  }

  const resultado = await excluirResponsavel(numeroId);
  if (!resultado.ok) {
    return Response.json({ erro: resultado.motivo, documentos: resultado.documentos }, { status: 409 });
  }
  return Response.json({ ok: true });
}
