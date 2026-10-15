import { count, eq, or } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { documentos, setores } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId)) return Response.json({ erro: "Identificador inválido" }, { status: 400 });

  const ligados = await db
    .select({ total: count() })
    .from(documentos)
    .where(or(eq(documentos.setorOrigemId, numeroId), eq(documentos.setorDestinoId, numeroId)));

  if (Number(ligados[0]?.total ?? 0) > 0) {
    return Response.json(
      { erro: "Unidade possui documentos vinculados. Inative-a em vez de excluir." },
      { status: 409 },
    );
  }

  const [removido] = await db.delete(setores).where(eq(setores.id, numeroId)).returning();
  if (!removido) return Response.json({ erro: "Unidade não encontrada" }, { status: 404 });
  return Response.json({ ok: true });
}
