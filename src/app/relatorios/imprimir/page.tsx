import Link from "next/link";
import { AutoImprimir } from "@/components/impressao/AutoImprimir";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { ResumoImpressao, TabelaDocumentosImpressao } from "@/components/impressao/TabelaDocumentosImpressao";
import { botaoClasses } from "@/components/ui";
import { CONFIG_MOVIMENTACAO, CONFIG_STATUS, CONFIG_TIPO } from "@/lib/domain";
import { parseFiltros } from "@/lib/filters";
import { formatarData, formatarDataHora } from "@/lib/format";
import { buscarConfiguracao, listarTodosParaExportacao, resolverBrasao } from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Documento de impressão do detalhamento de expedientes.
 *
 * Rota própria (e não apenas CSS de impressão da tela) por três motivos:
 *  1. no papel sai o detalhamento e NADA mais — sem painel, filtros ou gráficos;
 *  2. a listagem é sempre a do PERÍODO COMPLETO, independente da paginação da tela;
 *  3. o cabeçalho é uma faixa compacta, liberando a folha para os registros.
 */
export default async function ImprimirRelatoriosPage({ searchParams }: Props) {
  const params = await searchParams;
  const filtros = parseFiltros({ ...params, pageSize: "10000" });

  const [documentos, config] = await Promise.all([listarTodosParaExportacao(filtros), buscarConfiguracao()]);
  const brasao = resolverBrasao(config ?? null);

  const periodo =
    filtros.de || filtros.ate
      ? `${filtros.de ? formatarData(filtros.de) : "início"} até ${filtros.ate ? formatarData(filtros.ate) : "hoje"}`
      : filtros.ano && filtros.ano !== "TODOS"
        ? `Exercício ${filtros.ano}`
        : "acervo completo";

  const filtrosAplicados = [
    filtros.tipo && filtros.tipo !== "TODOS" ? CONFIG_TIPO[filtros.tipo]?.label ?? filtros.tipo : null,
    filtros.movimentacao && filtros.movimentacao !== "TODOS"
      ? CONFIG_MOVIMENTACAO[filtros.movimentacao]?.label ?? filtros.movimentacao
      : null,
    filtros.status && filtros.status !== "TODOS" ? CONFIG_STATUS[filtros.status]?.label ?? filtros.status : null,
    filtros.q ? `busca: ${filtros.q}` : null,
  ].filter(Boolean) as string[];

  const queryVoltar = new URLSearchParams();
  Object.entries({
    de: filtros.de,
    ate: filtros.ate,
    tipo: filtros.tipo !== "TODOS" ? String(filtros.tipo) : undefined,
    movimentacao: filtros.movimentacao !== "TODOS" ? String(filtros.movimentacao) : undefined,
    status: filtros.status !== "TODOS" ? String(filtros.status) : undefined,
    ano: filtros.ano !== "TODOS" ? String(filtros.ano) : undefined,
    q: filtros.q,
  }).forEach(([chave, valor]) => {
    if (valor) queryVoltar.set(chave, String(valor));
  });

  return (
    <div className="pagina-documento">
      <AutoImprimir />

      <div className="barra-impressao no-print">
        <div>
          <p className="text-sm font-semibold text-slate-900">Impressão do detalhamento</p>
          <p className="text-xs text-slate-500">
            Apenas a listagem do período — <strong>{documentos.length} registro(s)</strong>. A caixa de impressão abre
            automaticamente: escolha “Salvar como PDF” ou a impressora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotaoImprimir />
          <Link href={`/relatorios?${queryVoltar.toString()}`} className={botaoClasses("secundario")}>
            Voltar aos relatórios
          </Link>
        </div>
      </div>

      <article className="folha-detalhamento">
        <header className="cabecalho-detalhamento">
          {brasao.temImagem && brasao.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brasao.src} alt="Brasão" className="brasao-mini" />
          ) : (
            <span className="brasao-mini monograma-mini">{(config?.orgaoSigla ?? "EEPMF").slice(0, 6)}</span>
          )}

          <div className="identificacao">
            <p className="orgao">{config?.orgaoNome || "Unidade escolar"}</p>
            <p className="titulo">Detalhamento de Expedientes</p>
          </div>

          <div className="contexto">
            <p>
              <strong>Período:</strong> {periodo}
            </p>
            {filtrosAplicados.length > 0 && <p>Filtros: {filtrosAplicados.join(" · ")}</p>}
            <p>Emitido em {formatarDataHora(new Date())}</p>
          </div>
        </header>

        <ResumoImpressao documentos={documentos} />

        {documentos.length === 0 ? (
          <p className="sem-registros">Nenhum documento localizado para o período e os filtros informados.</p>
        ) : (
          <TabelaDocumentosImpressao documentos={documentos} />
        )}

        <footer className="rodape-detalhamento">
          <span>
            {config?.orgaoNome}
            {config?.cidade ? ` — ${config.cidade}/${config.uf}` : ""}
          </span>
          <span>SICED · {documentos.length} registro(s) listado(s)</span>
        </footer>
      </article>
    </div>
  );
}
