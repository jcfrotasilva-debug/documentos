import { NextRequest } from "next/server";
import { limparBase, previaLimpeza, type EscopoLimpeza } from "@/lib/services/manutencao";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    const previa = await previaLimpeza();
    return Response.json({ ok: true, previa });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao inspecionar a base";
    return Response.json({ ok: false, erro: mensagem }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let corpo: { escopo?: string; confirmar?: boolean } = {};
  try {
    corpo = (await request.json()) as { escopo?: string; confirmar?: boolean };
  } catch {
    corpo = {};
  }

  const escopo: EscopoLimpeza = corpo.escopo === "total" ? "total" : "demonstracao";
  if (corpo.confirmar !== true) {
    return Response.json(
      { ok: false, erro: "Confirmação obrigatória: envie { confirmar: true } para executar a limpeza." },
      { status: 428 },
    );
  }

  try {
    const relatorio = await limparBase(escopo);
    return Response.json({ ok: true, relatorio, previa: await previaLimpeza() });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao limpar a base";
    return Response.json({ ok: false, erro: mensagem }, { status: 500 });
  }
}
