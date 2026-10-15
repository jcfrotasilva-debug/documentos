import { NextRequest } from "next/server";
import { buscarConfiguracao, salvarConfiguracao } from "@/lib/services/documentos";
import { configuracaoInputSchema, primeiraMensagemErro } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const configuracao = await buscarConfiguracao();
  return Response.json({ configuracao });
}

export async function PUT(request: NextRequest) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }
  const analise = configuracaoInputSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }
  const configuracao = await salvarConfiguracao({
    orgaoNome: analise.data.orgaoNome,
    orgaoUnidade: analise.data.orgaoUnidade,
    orgaoSigla: analise.data.orgaoSigla,
    endereco: analise.data.endereco ?? "",
    cidade: analise.data.cidade ?? "",
    uf: analise.data.uf ?? "",
    cep: analise.data.cep ?? "",
    telefone: analise.data.telefone ?? "",
    email: analise.data.email ?? "",
    site: analise.data.site ?? "",
    responsavelPadrao: analise.data.responsavelPadrao ?? "",
    cargoPadrao: analise.data.cargoPadrao ?? "",
  });
  return Response.json({ ok: true, configuracao });
}
