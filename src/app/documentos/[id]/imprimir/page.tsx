import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { botaoClasses } from "@/components/ui";
import { CONFIG_MEIO, CONFIG_SIGILO, CONFIG_TIPO } from "@/lib/domain";
import { formatarData, formatarMoeda } from "@/lib/format";
import { buscarConfiguracao, buscarDocumento } from "@/lib/services/documentos";
import { buscarResponsavelPorNome } from "@/lib/services/responsaveis";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function dataLonga(iso: string, cidade: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  const texto = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(ano, mes - 1, dia)),
  );
  return `${cidade ? `${cidade}, ` : ""}${texto}`;
}

export default async function ImprimirDocumentoPage({ params }: Props) {
  const { id } = await params;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId)) notFound();

  const registro = await buscarDocumento(numeroId);
  if (!registro) notFound();

  const [config, responsavelRegistro] = await Promise.all([
    buscarConfiguracao(),
    buscarResponsavelPorNome(registro.documento.responsavel),
  ]);

  const { documento, itens } = registro;
  const tipo = CONFIG_TIPO[documento.tipo];
  const totalItens = itens.reduce((soma, item) => soma + item.quantidade, 0);
  const valorItens = itens.reduce((soma, item) => soma + (item.valor ? Number(item.valor) : 0), 0);
  const cidade = config?.cidade ?? "";

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Pré-visualização de impressão — {documento.numero}
          </h1>
          <p className="text-xs text-slate-500">
            Documento formatado no padrão ofício. Use &ldquo;Imprimir&rdquo; para gerar o PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotaoImprimir />
          <Link href={`/documentos/${documento.id}`} className={botaoClasses("secundario")}>
            Voltar ao documento
          </Link>
        </div>
      </div>

      <article className="print-area mx-auto max-w-[880px] rounded-xl border border-slate-200 bg-white px-10 py-10 shadow-sm print:max-w-none">
        <header className="flex items-start gap-5 border-b-2 border-slate-800 pb-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-slate-800 text-center text-[11px] font-bold uppercase leading-tight text-slate-800">
            {(config?.orgaoSigla ?? "ÓRGÃO").slice(0, 10)}
          </span>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-900">
              {config?.orgaoNome || "Unidade escolar"}
            </p>
            {config?.orgaoUnidade && (
              <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">{config.orgaoUnidade}</p>
            )}
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              {[config?.endereco, [config?.cidade, config?.uf].filter(Boolean).join("/")]
                .filter(Boolean)
                .join(" — ")}
              {config?.cep ? ` · CEP ${config.cep}` : ""}
              <br />
              {[config?.telefone, config?.email, config?.site].filter(Boolean).join(" · ")}
            </p>
          </div>
        </header>

        <div className="mt-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Espécie</p>
            <h2 className="mt-1 text-lg font-bold uppercase tracking-wide text-slate-900">{tipo.label}</h2>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Número</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900">{documento.numero}</p>
            <p className="mt-1 text-xs text-slate-600">{dataLonga(documento.dataDocumento, cidade)}</p>
          </div>
        </div>

        {documento.grauSigilo !== "OSTENSIVO" && (
          <p className="mt-4 rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-slate-700">
            {CONFIG_SIGILO[documento.grauSigilo].label} — divulgação controlada
          </p>
        )}

        <section className="mt-8 space-y-1 text-sm leading-relaxed text-slate-800">
          <p className="font-semibold uppercase tracking-wide text-[12px] text-slate-600">
            {documento.movimentacao === "RECEBIMENTO"
              ? "Registro de recebimento de documento"
              : "Registro de expedição de documento"}
          </p>
          <p>
            <span className="font-semibold">Interessado:</span>{" "}
            {documento.interessado ?? documento.destinatarioNome ?? "não informado"}
          </p>
          {documento.numeroProcesso && (
            <p>
              <span className="font-semibold">Processo:</span> {documento.numeroProcesso}
            </p>
          )}
          <p className="text-slate-600">
            Nº original no registro: {documento.numeroLegado ?? documento.numero}
          </p>
        </section>

        <section className="mt-6 border-y border-slate-200 py-3">
          <p className="text-sm text-slate-800">
            <span className="font-bold uppercase">Assunto:</span> {documento.assunto}
          </p>
          {documento.referenciaExterna && (
            <p className="mt-1 text-xs text-slate-600">Referência: {documento.referenciaExterna}</p>
          )}
        </section>

        <section className="mt-6 space-y-4 text-justify text-[13.5px] leading-7 text-slate-800">
          {(documento.conteudo ?? "").split(/\n+/).filter(Boolean).map((paragrafo, indice) => (
            <p key={indice} className="indent-10">
              {paragrafo}
            </p>
          ))}
          {!documento.conteudo && (
            <p className="indent-10 text-slate-500">
              (Sem conteúdo textual registrado — utilize o campo de teor na ficha do documento.)
            </p>
          )}
        </section>

        {itens.length > 0 && (
          <section className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
              Relação de Remessa / documentos relacionados
            </h3>
            <table className="mt-3 w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold">Item</th>
                  <th className="border border-slate-300 px-2 py-1.5 font-semibold">Descrição do documento</th>
                  <th className="border border-slate-300 px-2 py-1.5 font-semibold">Referência</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold">Qtd.</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right font-semibold">Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{item.ordem}</td>
                    <td className="border border-slate-300 px-2 py-1.5">
                      {item.descricao}
                      {item.observacao ? <span className="block text-[11px] text-slate-500">{item.observacao}</span> : null}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 font-mono text-[11.5px]">
                      {item.numeroReferencia ?? "—"}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{item.quantidade}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                      {formatarMoeda(item.valor)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="border border-slate-300 px-2 py-1.5 text-right" colSpan={3}>
                    Totais
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{totalItens}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                    {formatarMoeda(valorItens)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        <p className="mt-8 text-center text-[13px] text-slate-700">Atenciosamente,</p>

        <div className="mx-auto mt-12 w-80 text-center">
          <div className="border-t border-slate-800 pt-2">
            <p className="text-[13px] font-semibold text-slate-900">{documento.responsavel}</p>
            <p className="text-[12px] text-slate-600">
              {documento.cargoResponsavel ?? responsavelRegistro?.cargo ?? config?.cargoPadrao ?? ""}
            </p>
            {(responsavelRegistro?.matricula || responsavelRegistro?.lotacao) && (
              <p className="mt-0.5 text-[11px] text-slate-600">
                {[responsavelRegistro?.matricula ? `RF/Matrícula: ${responsavelRegistro.matricula}` : null, responsavelRegistro?.lotacao]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-3 text-[10.5px] text-slate-500">
          <div className="flex flex-wrap justify-between gap-2">
            <span>
              Documento gerado eletronicamente pelo SICED · {documento.numero} · exercício {documento.ano}
            </span>
            <span>
              Meio de envio: {CONFIG_MEIO[documento.meioEnvio]} · {documento.qtdPaginas} página(s) ·{" "}
              {documento.qtdAnexos} anexo(s)
            </span>
          </div>
          <span className="mt-1 block">
            Data do documento: {formatarData(documento.dataDocumento)} · expedição:{" "}
            {formatarData(documento.dataExpedicao)} · prazo para resposta: {formatarData(documento.prazoResposta)}
          </span>
        </footer>
      </article>
    </div>
  );
}
