import { importarBaseOficial } from "@/lib/services/importacao";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    const relatorio = await importarBaseOficial();
    return Response.json({ ok: relatorio.erros.length === 0, ...relatorio });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha na importação da base oficial";
    return Response.json({ ok: false, erro: mensagem }, { status: 500 });
  }
}
