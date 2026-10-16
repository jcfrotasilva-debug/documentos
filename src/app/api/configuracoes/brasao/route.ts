import { NextRequest } from "next/server";
import { buscarConfiguracao, removerBrasao, resolverBrasao, salvarBrasao } from "@/lib/services/documentos";
import { brasaoUploadSchema, primeiraMensagemErro } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Envia (ou substitui) a imagem do brasão impressa no timbre. */
export async function POST(request: NextRequest) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }

  const analise = brasaoUploadSchema.safeParse(corpo);
  if (!analise.success) {
    return Response.json({ erro: primeiraMensagemErro(analise.error) }, { status: 422 });
  }

  await buscarConfiguracao(); /* garante o registro 1 antes de atualizar */
  const registro = await salvarBrasao(analise.data.arquivo, analise.data.nomeArquivo || "brasao");
  const brasao = resolverBrasao(registro);

  return Response.json({
    ok: true,
    brasao: { ...brasao, dadosPreview: undefined },
    mensagem: `Brasão atualizado (${brasao.nomeArquivo ?? "arquivo"}). Já aparece no timbre da impressão.`,
  });
}

/** Remove a imagem enviada e volta a usar o arquivo público/URL configurada. */
export async function DELETE() {
  await buscarConfiguracao();
  const registro = await removerBrasao();
  return Response.json({
    ok: true,
    brasao: resolverBrasao(registro),
    mensagem: "Brasão removido. O timbre volta a usar o arquivo público ou a URL informada.",
  });
}
