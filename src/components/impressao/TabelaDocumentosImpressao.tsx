import type { DocumentoListado } from "@/lib/services/documentos";
import { CONFIG_MOVIMENTACAO, CONFIG_STATUS, CONFIG_TIPO } from "@/lib/domain";
import { formatarData } from "@/lib/format";

/**
 * Tabela para impressão do detalhamento de expedientes.
 * Projetada para papel A4 retrato: fonte compacta, colunas fixas, cabeçalho
 * repetido em todas as páginas e linhas que não se quebram entre folhas.
 */
export function TabelaDocumentosImpressao({ documentos }: { documentos: DocumentoListado[] }) {
  const totalPaginas = documentos.reduce((soma, documento) => soma + (documento.qtdPaginas ?? 0), 0);
  const totalVolumes = documentos.reduce((soma, documento) => soma + (documento.qtdAnexos ?? 0), 0);

  return (
    <table className="tabela-impressao">
      <colgroup>
        <col style={{ width: "3%" }} />
        <col style={{ width: "9.5%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "6.5%" }} />
        <col style={{ width: "31%" }} />
        <col style={{ width: "18%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "3.5%" }} />
        <col style={{ width: "3.5%" }} />
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          <th>Número</th>
          <th>Mov.</th>
          <th>Data</th>
          <th>Assunto</th>
          <th>Interessado</th>
          <th>Nº processo</th>
          <th>Situação</th>
          <th>Pág.</th>
          <th>Anex.</th>
        </tr>
      </thead>
      <tbody>
        {documentos.map((documento, indice) => (
          <tr key={documento.id}>
            <td className="text-right tabular-nums text-slate-500">{indice + 1}</td>
            <td className="whitespace-nowrap font-mono font-semibold">{documento.numero}</td>
            <td className="whitespace-nowrap">
              {documento.movimentacao === "RECEBIMENTO" ? "Receb." : "Exped."}
            </td>
            <td className="whitespace-nowrap tabular-nums">{formatarData(documento.dataDocumento)}</td>
            <td className="assunto">{documento.assunto}</td>
            <td className="truncar">{documento.interessado ?? documento.destinatarioNome ?? "—"}</td>
            <td className="truncar whitespace-nowrap font-mono text-[7.5px]">
              {documento.numeroProcesso ?? "—"}
            </td>
            <td className="whitespace-nowrap">{CONFIG_STATUS[documento.status]?.label ?? documento.status}</td>
            <td className="text-right tabular-nums">{documento.qtdPaginas}</td>
            <td className="text-right tabular-nums">{documento.qtdAnexos}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={8} className="rodape-total">
            Total de documentos no período
          </td>
          <td className="rodape-total text-right tabular-nums">{totalPaginas}</td>
          <td className="rodape-total text-right tabular-nums">{totalVolumes}</td>
        </tr>
      </tfoot>
    </table>
  );
}

/** Pluralização correta para texto de documento oficial. */
function plural(total: number, singular: string, pluralForma: string): string {
  return `${total} ${total === 1 ? singular : pluralForma}`;
}

/** Resumo de uma única linha — substitui os gráficos no papel. */
export function ResumoImpressao({ documentos }: { documentos: DocumentoListado[] }) {
  const porTipo = new Map<string, number>();
  documentos.forEach((documento) => {
    const rotulo = CONFIG_TIPO[documento.tipo]?.label ?? documento.tipo;
    porTipo.set(rotulo, (porTipo.get(rotulo) ?? 0) + 1);
  });
  const expedicao = documentos.filter((documento) => documento.movimentacao === "EXPEDICAO").length;
  const recebimento = documentos.length - expedicao;
  const totalPaginas = documentos.reduce((soma, documento) => soma + (documento.qtdPaginas ?? 0), 0);

  return (
    <div className="resumo-impressao">
      <p>
        <strong>{plural(documentos.length, "documento", "documentos")}</strong> ·{" "}
        {plural(expedicao, "expedição", "expedições")} · {plural(recebimento, "recebimento", "recebimentos")} ·{" "}
        {plural(totalPaginas, "página", "páginas")}
      </p>
      {porTipo.size > 0 && (
        <p>
          {[...porTipo.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([rotulo, total]) => `${rotulo}: ${total}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

/** Rótulo curto da movimentação, útil no cabeçalho de contexto. */
export function rotuloMovimentacao(movimentacao: DocumentoListado["movimentacao"]): string {
  return CONFIG_MOVIMENTACAO[movimentacao]?.label ?? movimentacao;
}
