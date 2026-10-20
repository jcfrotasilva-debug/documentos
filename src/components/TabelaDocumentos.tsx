import Link from "next/link";
import type { DocumentoListado } from "@/lib/services/documentos";
import { CONFIG_TIPO } from "@/lib/domain";
import { formatarData, hojeISO } from "@/lib/format";
import { ChipMovimentacao, ChipPrioridade, ChipStatus, ChipTipo, cx } from "@/components/ui";

export function TabelaDocumentos({
  documentos,
  compacta = false,
}: {
  documentos: DocumentoListado[];
  compacta?: boolean;
}) {
  const hoje = hojeISO();
  return (
    <div className="overflow-x-auto scroll-fino">
      <table className="tabela-docs w-full min-w-[1040px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-3 py-2 font-semibold">Número</th>
            <th className="px-3 py-2 font-semibold">Movimentação</th>
            <th className="px-3 py-2 font-semibold">Tipo</th>
            <th className="px-3 py-2 font-semibold">Data</th>
            <th className="px-3 py-2 font-semibold">Assunto / interessado</th>
            {!compacta && <th className="px-3 py-2 font-semibold">Nº do processo</th>}
            <th className="px-3 py-2 font-semibold">Situação</th>
            {!compacta && <th className="px-3 py-2 font-semibold">Prioridade</th>}
            <th className="px-3 py-2 font-semibold">Prazo</th>
            <th className="px-3 py-2 text-right font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documentos.map((documento) => {
            const vencido =
              documento.prazoResposta &&
              !["RECEBIDO", "ARQUIVADO", "CANCELADO"].includes(documento.status) &&
              documento.prazoResposta < hoje;
            return (
              <tr key={documento.id} className="align-top transition hover:bg-slate-50/80">
                <td className="px-3 py-3">
                  <Link
                    href={`/documentos/${documento.id}`}
                    className="font-mono text-[13px] font-semibold text-brand-700 hover:underline"
                  >
                    {documento.numero}
                  </Link>
                  {documento.numeroLegado && (
                    <span className="block text-[10px] text-slate-400">registro original {documento.numeroLegado}</span>
                  )}
                  {documento.grauSigilo !== "OSTENSIVO" && (
                    <span className="ml-1 text-[10px] font-semibold uppercase text-amber-600">
                      {documento.grauSigilo === "SIGILOSO" ? "sigiloso" : "restrito"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <ChipMovimentacao movimentacao={documento.movimentacao} />
                </td>
                <td className="px-3 py-3">
                  <ChipTipo tipo={documento.tipo} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">
                  {formatarData(documento.dataDocumento)}
                </td>
                <td className="max-w-[340px] px-3 py-3">
                  <Link href={`/documentos/${documento.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                    {documento.assunto}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {documento.interessado
                      ? `Interessado: ${documento.interessado}`
                      : documento.destinatarioNome
                        ? `Interessado: ${documento.destinatarioNome}`
                        : "Interessado não informado"}
                  </p>
                </td>
                {!compacta && (
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                    {documento.numeroProcesso ?? <span className="font-sans text-slate-400">—</span>}
                  </td>
                )}
                <td className="px-3 py-3">
                  <ChipStatus status={documento.status} />
                </td>
                {!compacta && (
                  <td className="px-3 py-3">
                    <ChipPrioridade prioridade={documento.prioridade} />
                  </td>
                )}
                <td className="px-3 py-3 text-xs">
                  {documento.prazoResposta ? (
                    <span className={cx("tabular-nums", vencido ? "font-semibold text-rose-600" : "text-slate-600")}>
                      {formatarData(documento.prazoResposta)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1 text-xs">
                    <Link
                      href={`/documentos/${documento.id}`}
                      className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/documentos/${documento.id}/editar`}
                      className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/documentos/${documento.id}/imprimir`}
                      className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                      target="_blank"
                    >
                      Imprimir
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={compacta ? 8 : 10} className="px-3 py-2 text-[11px] text-slate-400">
              {documentos.length} documento(s) listado(s) ·{" "}
              {Array.from(new Set(documentos.map((d) => CONFIG_TIPO[d.tipo].label))).join(" · ")}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
