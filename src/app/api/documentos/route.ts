import { NextRequest } from "next/server";
import { parseFiltros } from "@/lib/filters";
import { criarDocumento, listarDocumentos } from "@/lib/services/documentos";
import { documentoInputSchema, primeiraMensagemErro } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filtros = parseFiltros(params);
  const resultado = await listarDocumentos(filtros);
  return Response.json(resultado);
}

export async function POST(request: NextRequest) {
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
    const criado = await criarDocumento(analise.data, analise.data.criadoPor || "Usuário do sistema");
    return Response.json({ ok: true, ...criado }, { status: 201 });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao cadastrar documento";
    if (mensagem.includes("documentos_numero_idx")) {
      return Response.json({ erro: "Já existe um documento com este número." }, { status: 409 });
    }
    return Response.json({ erro: mensagem }, { status: 500 });
  }
}
