import { analisarBaseOficial, ultimasSincronizacoes } from "@/lib/services/importacao";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [analise, historico] = await Promise.all([analisarBaseOficial(), ultimasSincronizacoes(5)]);
    return Response.json({ ...analise, historico });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao analisar a base oficial";
    return Response.json({ erro: mensagem }, { status: 500 });
  }
}
