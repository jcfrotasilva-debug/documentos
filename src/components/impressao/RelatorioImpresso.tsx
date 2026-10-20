import type { DocumentoListado, RelatorioPeriodo } from "@/lib/services/documentos";
import type { Configuracao } from "@/db/schema";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import { Timbre } from "@/components/impressao/Timbre";
import { CONFIG_MOVIMENTACAO, CONFIG_STATUS, CONFIG_TIPO } from "@/lib/domain";

export function RelatorioImpresso({
  relatorio,
  detalhe,
  config,
  filtros,
}: {
  relatorio: RelatorioPeriodo;
  detalhe: DocumentoListado[];
  config: Configuracao | undefined;
  filtros: { de?: string; ate?: string; tipo?: string; status?: string; mov?: string; ano?: string };
}) {
  const periodo =
    filtros.de || filtros.ate
      ? `${filtros.de ? formatarData(filtros.de) : "Início"} até ${filtros.ate ? formatarData(filtros.ate) : "Hoje"}`
      : "Todo o acervo";

  const maiorTipo = Math.max(1, ...relatorio.porTipo.map((i) => i.total));
  const maiorInteressado = Math.max(1, ...relatorio.porInteressado.map((i) => i.total));

  return (
    <article className="print-area mx-auto max-w-[1100px] bg-white px-4 py-4 text-slate-900 print:max-w-none print:px-0 print:py-0">
      <Timbre config={config} className="mb-6" />

      <div className="mb-6 text-center">
        <h1 className="text-lg font-bold uppercase tracking-tight">
          Relatório de Expedição e Recebimento de Documentos
        </h1>
        <p className="text-sm font-semibold text-slate-700">Período: {periodo}</p>
      </div>

      {/* Resumo Consolidado (KPIs) */}
      <div className="mb-8 grid grid-cols-4 gap-4 border border-slate-300 bg-slate-50 p-4 text-center">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500">Total de Documentos</p>
          <p className="text-xl font-bold">{relatorio.total}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500">Páginas Expedidas</p>
          <p className="text-xl font-bold">{relatorio.paginas}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500">Interessados Atendidos</p>
          <p className="text-xl font-bold">{relatorio.porInteressado.length}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500">Exercícios Lidos</p>
          <p className="text-xl font-bold">{relatorio.porAno.length}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-8">
        {/* Distribuição por Espécie */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase border-b border-slate-300 pb-1">Distribuição por Espécie</h2>
          <table className="w-full text-[11px]">
            <tbody>
              {relatorio.porTipo.map((item) => (
                <tr key={item.chave} className="border-b border-slate-100">
                  <td className="py-1 font-medium">{CONFIG_TIPO[item.chave]?.label ?? item.chave}</td>
                  <td className="py-1 text-right tabular-nums font-semibold">{item.total}</td>
                  <td className="py-1 pl-4 w-24">
                    <div className="h-1.5 w-full bg-slate-100">
                      <div
                        className="h-full bg-slate-700"
                        style={{ width: `${(item.total / maiorTipo) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Distribuição por Situação / Movimentação */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase border-b border-slate-300 pb-1">Situação Atual</h2>
            <table className="w-full text-[11px]">
              <tbody>
                {relatorio.porStatus.map((item) => (
                  <tr key={item.chave} className="border-b border-slate-100">
                    <td className="py-1 font-medium">{CONFIG_STATUS[item.chave]?.label ?? item.chave}</td>
                    <td className="py-1 text-right tabular-nums font-semibold">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="mb-3 text-[10px] font-bold uppercase text-slate-500">Meios de Envio</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
              {relatorio.porMeio.map((item) => (
                <span key={item.chave}>
                  <strong>{item.chave}:</strong> {item.total}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interessados Recorrentes */}
      <div className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase border-b border-slate-300 pb-1">Principais Interessados</h2>
        <div className="grid grid-cols-2 gap-x-12 gap-y-1">
          {relatorio.porInteressado.slice(0, 12).map((item) => (
            <div key={item.chave} className="flex items-center justify-between border-b border-slate-50 text-[10px] py-0.5">
              <span className="truncate pr-2">{item.chave}</span>
              <span className="tabular-nums font-bold">{item.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Listagem Detalhada */}
      <div className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase border-b border-slate-300 pb-1">Detalhamento dos Registros</h2>
        <table className="w-full border-collapse text-[9.5px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-1.5 py-1 text-left">Número</th>
              <th className="border border-slate-300 px-1 py-1 text-center">Mov.</th>
              <th className="border border-slate-300 px-1 py-1 text-left">Tipo</th>
              <th className="border border-slate-300 px-1.5 py-1 text-left">Data</th>
              <th className="border border-slate-300 px-1.5 py-1 text-left">Interessado</th>
              <th className="border border-slate-300 px-1.5 py-1 text-left">Assunto</th>
              <th className="border border-slate-300 px-1.5 py-1 text-left">Situação</th>
            </tr>
          </thead>
          <tbody>
            {detalhe.map((doc) => (
              <tr key={doc.id}>
                <td className="border border-slate-300 px-1.5 py-1 font-mono font-semibold">{doc.numero}</td>
                <td className="border border-slate-300 px-1 py-1 text-center">
                   {CONFIG_MOVIMENTACAO[doc.movimentacao].seta}
                </td>
                <td className="border border-slate-300 px-1 py-1">{CONFIG_TIPO[doc.tipo].sigla}</td>
                <td className="border border-slate-300 px-1.5 py-1 tabular-nums">{formatarData(doc.dataDocumento)}</td>
                <td className="border border-slate-300 px-1.5 py-1 truncate max-w-[140px]">
                  {doc.interessado || doc.destinatarioNome || "—"}
                </td>
                <td className="border border-slate-300 px-1.5 py-1 italic">{doc.assunto}</td>
                <td className="border border-slate-300 px-1.5 py-1">{CONFIG_STATUS[doc.status].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {relatorio.total > detalhe.length && (
          <p className="mt-2 text-[9px] text-slate-500 italic">
            * Listagem limitada aos primeiros {detalhe.length} registros. Para o extrato completo, utilize a exportação CSV.
          </p>
        )}
      </div>

      {/* Assinaturas */}
      <div className="mt-16 grid grid-cols-2 gap-16 px-10 text-center text-sm">
        <div>
          <div className="border-t border-slate-800 pt-2">
            <p className="font-bold">Responsável pelo Expediente</p>
            <p className="text-xs text-slate-600">Assinatura e carimbo</p>
          </div>
        </div>
        <div>
          <div className="border-t border-slate-800 pt-2">
            <p className="font-bold">Direção de Escola</p>
            <p className="text-xs text-slate-600">Assinatura e carimbo</p>
          </div>
        </div>
      </div>

      <footer className="mt-12 border-t border-slate-200 pt-2 text-[9px] text-slate-400 flex justify-between">
        <span>SICED · Sistema de Controle de Expedientes</span>
        <span>Gerado em {formatarDataHora(new Date())}</span>
      </footer>
    </article>
  );
}
