import { ConfiguracoesPainel, type LinhaNumeracao } from "@/components/ConfiguracoesPainel";
import { ManutencaoBase } from "@/components/ManutencaoBase";
import { CONFIG_TIPO, MOVIMENTACOES, TIPOS_DOCUMENTO, prefixoPadrao } from "@/lib/domain";
import { hojeISO } from "@/lib/format";
import { anosDisponiveis, buscarConfiguracao, listarNumeracao } from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const anoAtual = Number(hojeISO().slice(0, 4));
  const [config, numeracaoAno, anos] = await Promise.all([
    buscarConfiguracao(),
    listarNumeracao(anoAtual),
    anosDisponiveis(),
  ]);

  const registros = new Map(numeracaoAno.map((linha) => [`${linha.movimentacao}:${linha.tipo}`, linha]));
  const linhas: LinhaNumeracao[] = MOVIMENTACOES.flatMap((movimentacao) =>
    TIPOS_DOCUMENTO.map((tipo) => {
      const registro = registros.get(`${movimentacao}:${tipo}`);
      return {
        movimentacao,
        tipo,
        prefixo: registro?.prefixo ?? prefixoPadrao(movimentacao, tipo),
        digitos: registro?.digitos ?? 5,
        ultimoNumero: registro?.ultimoNumero ?? 0,
        chaveLegada: registro?.chaveLegada ?? null,
      };
    }),
  );
  void CONFIG_TIPO;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Numeração e identificação do órgão</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure as regras de geração automática de números (por movimentação, espécie e exercício) e os dados que
          compõem o timbre dos documentos impressos.
        </p>
      </div>

      <ConfiguracoesPainel
        configuracao={{
          orgaoNome: config?.orgaoNome ?? "",
          orgaoUnidade: config?.orgaoUnidade ?? "",
          orgaoSigla: config?.orgaoSigla ?? "",
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
