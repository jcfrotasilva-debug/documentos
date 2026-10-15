import { asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { setores } from "@/db/schema";
import { ehViolacaoUnicidade, textoDoErro } from "@/lib/erros";
import { primeiraMensagemErro, setorInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const lista = await db.select().from(setores).orderBy(asc(setores.sigla));
  return Response.json({ setores: lista });
}

export async function POST(request: NextRequest) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }
  const analise = setorInputSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }
  try {
    const [criado] = await db.insert(setores).values(analise.data).returning();
    return Response.json({ ok: true, setor: criado }, { status: 201 });
  } catch (erro) {
    if (ehViolacaoUnicidade(erro, ["setores_sigla_idx", "setores"])) {
      return Response.json({ erro: "Já existe uma unidade com essa sigla." }, { status: 409 });
    }
    return Response.json({ erro: textoDoErro(erro) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let corpo: { id?: number } & Record<string, unknown>;
  try {
    corpo = (await request.json()) as { id?: number } & Record<string, unknown>;
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }
  const id = Number(corpo.id);
  if (!Number.isInteger(id)) return Response.json({ erro: "Identificador inválido" }, { status: 400 });

  const analise = setorInputSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }
  const [atualizado] = await db.update(setores).set(analise.data).where(eq(setores.id, id)).returning();
  if (!atualizado) return Response.json({ erro: "Unidade não encontrada" }, { status: 404 });
  return Response.json({ ok: true, setor: atualizado });
}
