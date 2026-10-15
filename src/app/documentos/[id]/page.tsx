import Link from "next/link";
import { notFound } from "next/navigation";
import { PainelTramitacao } from "@/components/PainelTramitacao";
import {
  Card,
  ChipMovimentacao,
  ChipPrioridade,
  ChipSigilo,
  ChipStatus,
  ChipTipo,
  EmptyState,
  LinhaInfo,
  botaoClasses,
  cx,
} from "@/components/ui";
import { CONFIG_MEIO, CONFIG_SIGILO } from "@/lib/domain";
import { formatarData, formatarDataHora, formatarMoeda, textoPrazo } from "@/lib/format";
import { buscarDocumento } from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentoDetalhePage({ params, searchParams }: Props) {
  const { id } = await params;
  const busca = await searchParams;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId)) notFound();

  const registro = await buscarDocumento(numeroId);
  if (!registro) notFound();

  const { documento, itens, movimentos } = registro;
  const prazo = textoPrazo(documento.prazoResposta);
  const totalItens = itens.reduce((soma, item) => soma + item.quantidade, 0);
  const valorItens = itens.reduce((soma, item) => soma + (item.valor ? Number(item.valor) : 0), 0);

  return (
    <div className="space-y-5">
      {busca.salvo && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Documento salvo com sucesso. Numeração definitiva: <strong className="font-mono">{documento.numero}</strong>
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ChipMovimentacao movimentacao={documento.movimentacao} />
            <ChipTipo tipo={documento.tipo} />
            <ChipStatus status={documento.status} />
            <ChipPrioridade prioridade={documento.prioridade} />
            <ChipSigilo sigilo={documento.grauSigilo} />
          </div>
          <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900">{documento.numero}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{documento.assunto}</p>
          <p className="mt-1 text-xs text-slate-500">
            Exercício {documento.ano} · sequencial nº {documento.numeroSequencial} · emitido em{" "}
            {formatarData(documento.dataDocumento)}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Link href="/documentos" className={botaoClasses("fantasma")}>
            Acervo
          </Link>
          <Link href={`/documentos/${documento.id}/imprimir`} target="_blank" className={botaoClasses("secundario")}>
            🖨 Imprimir / PDF
          </Link>
          <Link href={`/documentos/${documento.id}/editar`} className={botaoClasses("primario")}>
            Editar documento
          </Link>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Card titulo="Dados do expediente" subtitulo="Identificação, origem, destino e prazos">
            <div className="grid gap-x-8 md:grid-cols-2">
              <div>
                <LinhaInfo
                  rotulo="Movimentação"
                  valor={
                    documento.movimentacao === "RECEBIMENTO" ? "Recebimento (entrada)" : "Expedição (saída)"
                  }
                />
                <LinhaInfo
                  rotulo="Interessado"
                  valor={documento.interessado ?? documento.destinatarioNome ?? "—"}
                />
                <LinhaInfo rotulo="Nº do processo" valor={documento.numeroProcesso ?? "—"} />
                <LinhaInfo rotulo="Registro original" valor={documento.numeroLegado ?? "—"} />

                <LinhaInfo rotulo="Responsável pela expedição" valor={documento.responsavel} />
                <LinhaInfo rotulo="Cargo do responsável" valor={documento.cargoResponsavel ?? "—"} />
              </div>
              <div>
                <LinhaInfo rotulo="Data do documento" valor={formatarData(documento.dataDocumento)} />
                <LinhaInfo rotulo="Data de expedição" valor={formatarData(documento.dataExpedicao)} />
                <LinhaInfo
                  rotulo="Prazo para resposta"
                  valor={
                    <span className="flex items-center justify-end gap-2">
                      {formatarData(documento.prazoResposta)}
                      {documento.prazoResposta && (
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                            prazo.tom === "vencido"
                              ? "bg-rose-50 text-rose-700 ring-rose-200"
                              : prazo.tom === "atencao"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-emerald-50 text-emerald-700 ring-emerald-200",
                          )}
                        >
                          {prazo.texto}
                        </span>
                      )}
                    </span>
                  }
                />
                <LinhaInfo rotulo="Meio de envio" valor={CONFIG_MEIO[documento.meioEnvio]} />
                <LinhaInfo rotulo="Grau de sigilo" valor={CONFIG_SIGILO[documento.grauSigilo]?.label ?? "—"} />
                <LinhaInfo rotulo="Referência externa" valor={documento.referenciaExterna ?? "—"} />
                <LinhaInfo
                  rotulo="Volumes / páginas"
                  valor={`${documento.qtdAnexos} anexo(s) · ${documento.qtdPaginas} página(s)`}
                />
              </div>
            </div>
          </Card>

          <Card titulo="Teor do documento">
            {documento.conteudo ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{documento.conteudo}</p>
            ) : (
              <p className="text-xs text-slate-500">Nenhum conteúdo textual registrado.</p>
            )}
            {documento.observacoes && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Observações internas
                </p>
                <p className="mt-1 whitespace-pre-line text-xs text-slate-600">{documento.observacoes}</p>
              </div>
            )}
          </Card>

          <Card
            titulo={documento.tipo === "RELACAO_REMESSA" ? "Relação de Remessa" : "Documentos relacionados"}
            subtitulo={
              itens.length
                ? `${itens.length} item(ns) · ${totalItens} unidade(s) remetida(s) · ${formatarMoeda(valorItens)}`
                : undefined
            }
            espacamento="p-0"
          >
            {itens.length === 0 ? (
              <div className="p-5">
                <EmptyState titulo="Nenhum item relacionado" descricao="Edite o documento para compor a relação de itens." />
              </div>
            ) : (
              <div className="overflow-x-auto scroll-fino">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Descrição</th>
                      <th className="px-3 py-2 font-semibold">Referência</th>
                      <th className="px-3 py-2 text-center font-semibold">Qtd.</th>
                      <th className="px-3 py-2 text-right font-semibold">Valor</th>
                      <th className="px-5 py-2 font-semibold">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3 text-xs text-slate-500">{item.ordem}</td>
                        <td className="px-3 py-3 text-slate-800">{item.descricao}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.numeroReferencia ?? "—"}</td>
                        <td className="px-3 py-3 text-center tabular-nums">{item.quantidade}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatarMoeda(item.valor)}</td>
                        <td className="px-5 py-3 text-xs text-slate-500">{item.observacao ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card titulo="Histórico de movimentações" subtitulo="Trilha de auditoria do documento" espacamento="p-0">
            {movimentos.length === 0 ? (
              <div className="p-5">
                <EmptyState titulo="Sem movimentações registradas" />
              </div>
            ) : (
              <ol className="relative space-y-0 px-5 py-4">
                {movimentos.map((movimento, indice) => (
                  <li key={movimento.id} className="relative flex gap-4 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-brand-100" />
                      {indice < movimentos.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ChipStatus status={movimento.status} />
                        <span className="text-[11px] text-slate-400">{formatarDataHora(movimento.criadoEm)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{movimento.descricao}</p>
                      <p className="text-[11px] text-slate-500">Registrado por {movimento.usuario}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <PainelTramitacao documentoId={documento.id} statusAtual={documento.status} numero={documento.numero} />

          <Card titulo="Registro no sistema" className="no-print">
            <LinhaInfo rotulo="Cadastrado em" valor={formatarDataHora(documento.criadoEm)} />
            <LinhaInfo rotulo="Última atualização" valor={formatarDataHora(documento.atualizadoEm)} />
            <LinhaInfo rotulo="Cadastrado por" valor={documento.criadoPor} />
            <LinhaInfo rotulo="Sequencial do exercício" valor={documento.numeroSequencial} />
          </Card>
        </div>
      </div>
    </div>
  );
}
