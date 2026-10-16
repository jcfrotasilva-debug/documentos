import { ConfiguracoesPainel, type LinhaNumeracao } from "@/components/ConfiguracoesPainel";
import { ManutencaoBase } from "@/components/ManutencaoBase";
import { hojeISO } from "@/lib/format";
import { anosDisponiveis, buscarConfiguracao } from "@/lib/services/documentos";
import { painelSequencia } from "@/lib/services/sequencia";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const anoAtual = Number(hojeISO().slice(0, 4));
  const [config, sequencias, anos] = await Promise.all([
    buscarConfiguracao(),
    painelSequencia(anoAtual),
    anosDisponiveis(),
  ]);

  const linhas: LinhaNumeracao[] = sequencias.map((linha) => ({
    movimentacao: linha.movimentacao,
    tipo: linha.tipo,
    ano: linha.ano,
    prefixo: linha.prefixo,
    digitos: linha.digitos,
    ultimoNumero: linha.ultimoNumero,
    proximoNumero: linha.proximoNumero,
    ultimoNoAcervo: linha.ultimoNoAcervo,
    documentos: linha.documentos,
    proximoJaUsado: linha.proximoJaUsado,
    chaveLegada: linha.chaveLegada,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sequência de numeração e dados do órgão</h1>
        <p className="mt-1 text-sm text-slate-500">
          Defina o próximo número de cada espécie e exercício para dar continuidade à sequência existente, e mantenha os
          dados que compõem o timbre dos documentos impressos.
        </p>
      </div>

      <ConfiguracoesPainel
        configuracao={{
          orgaoNome: config?.orgaoNome ?? "",
          orgaoUnidade: config?.orgaoUnidade ?? "",
          orgaoSigla: config?.orgaoSigla ?? "",
          orgaoHierarquia: config?.orgaoHierarquia ?? "",
          logoUrl: config?.logoUrl ?? "",
          endereco: config?.endereco ?? "",
          cidade: config?.cidade ?? "",
          uf: config?.uf ?? "",
          cep: config?.cep ?? "",
          telefone: config?.telefone ?? "",
          email: config?.email ?? "",
          site: config?.site ?? "",
          responsavelPadrao: config?.responsavelPadrao ?? "",
          cargoPadrao: config?.cargoPadrao ?? "",
        }}
        numeracao={linhas}
        ano={anoAtual}
        anos={anos}
      />

      <ManutencaoBase />
    </div>
  );
}
