import Link from "next/link";
import { SeedButton } from "@/components/SeedButton";
import { TabelaDocumentos } from "@/components/TabelaDocumentos";
import { Card, ChipStatus, EmptyState, StatCard, botaoClasses, cx } from "@/components/ui";
import { CONFIG_STATUS, CONFIG_TIPO, TIPOS_DOCUMENTO } from "@/lib/domain";
import { formatarData, textoPrazo } from "@/lib/format";
import { dadosDemoHabilitados } from "@/lib/runtime";
import { estatisticasDashboard } from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split("-");
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
}

export default async function PainelPage() {
  const demoHabilitado = dadosDemoHabilitados();
  const dados = await estatisticasDashboard();
  const maiorMes = Math.max(1, ...dados.serieMensal.map((item) => item.expedicao + item.recebimento));
  const totalTipo = new Map<TipoChave, number>();
  dados.porTipoMovimentacao.forEach((linha) => totalTipo.set(linha.tipo, (totalTipo.get(linha.tipo) ?? 0) + linha.total));
  const maiorTipo = Math.max(1, ...Array.from(totalTipo.values()));
  const maiorStatus = Math.max(1, ...dados.porStatus.map((item) => item.total));
  const maiorInteressado = Math.max(1, ...dados.porInteressado.map((item) => item.total));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Painel geral</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão consolidada das expedições e recebimentos, prazos, espécies documentais e unidades atendidas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/supabase" className={botaoClasses("secundario")}>
            Base oficial
          </Link>
          <Link href="/relatorios" className={botaoClasses("secundario")}>
            Relatórios
          </Link>
          <Link href="/documentos/novo" className={botaoClasses("primario")}>
            + Novo registro
          </Link>
        </div>
      </div>

      {dados.total === 0 && (
        <Card
          titulo="Base pronta para os registros reais"
          subtitulo="Nenhum documento no acervo. Comece importando a base oficial ou registrando o primeiro expediente."
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-slate-600">
              Importe os registros da base oficial para trazer numeração, interessados e contadores já existentes, ou
              cadastre o primeiro expediente manualmente. Antes de emitir documentos, revise os dados institucionais em
              Numeração e órgão.
            </p>
            <div className="flex items-center gap-2">
              <Link href="/supabase" className={botaoClasses("primario")}>
                Importar base oficial
              </Link>
              <Link href="/documentos/novo" className={botaoClasses("secundario")}>
                Registrar expediente
              </Link>
              {demoHabilitado && <SeedButton />}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Registros no acervo" valor={dados.total} tom="indigo" icone="▤" apoio="Expedições e recebimentos" />
        <StatCard
          label="Expedições no mês"
          valor={dados.expedidosMes}
          tom="sky"
          icone="↑"
          apoio={`${dados.totalExpedicao} no acervo`}
        />
        <StatCard
          label="Recebimentos no mês"
          valor={dados.recebidosMes}
          tom="emerald"
          icone="↓"
          apoio={`${dados.totalRecebimento} no acervo`}
        />
        <StatCard
          label="Prazos estourados"
          valor={dados.pendentesPrazo}
          tom="rose"
          icone="!"
          apoio="Aguardando resposta com prazo vencido"
        />
        <StatCard label="Rascunhos" valor={dados.rascunhos} tom="amber" icone="✎" apoio="Minutas em elaboração" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          titulo="Evolução mensal"
          subtitulo="Expedições (azul) e recebimentos (verde) nos últimos 12 meses"
        >
          <div className="flex h-56 items-end gap-2">
            {dados.serieMensal.map((item) => {
              const total = item.expedicao + item.recebimento;
              return (
                <div key={item.mes} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">{total || ""}</span>
                  <div className="flex h-full w-full flex-col justify-end gap-0.5">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-brand-700 to-brand-500"
                      style={{ height: `${(item.expedicao / maiorMes) * 100}%` }}
                      title={`${item.expedicao} expedição(ões)`}
                    />
                    <div
                      className="w-full rounded-b-md bg-gradient-to-t from-emerald-600 to-emerald-400"
                      style={{ height: `${(item.recebimento / maiorMes) * 100}%` }}
                      title={`${item.recebimento} recebimento(s)`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{rotuloMes(item.mes)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card titulo="Distribuição por espécie" subtitulo="Volume total por tipo documental">
          <ul className="space-y-3">
            {TIPOS_DOCUMENTO.map((tipo) => {
              const total = totalTipo.get(tipo) ?? 0;
              const config = CONFIG_TIPO[tipo];
              const expedicao = dados.porTipoMovimentacao.find((l) => l.tipo === tipo && l.movimentacao === "EXPEDICAO")?.total ?? 0;
              const recebimento = dados.porTipoMovimentacao.find((l) => l.tipo === tipo && l.movimentacao === "RECEBIMENTO")?.total ?? 0;
              return (
                <li key={tipo}>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium text-slate-700">{config.label}</span>
                    <span className="tabular-nums">{total}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={cx("h-full rounded-full", config.cor)} style={{ width: `${(total / maiorTipo) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    prefixos {config.prefixoExpedicao} / {config.prefixoRecebimento} · {expedicao} exp. · {recebimento} rec.
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card titulo="Situação atual" subtitulo="Posição dos documentos no fluxo de tramitação">
          <ul className="space-y-3">
            {Object.keys(CONFIG_STATUS).map((chave) => {
              const status = chave as keyof typeof CONFIG_STATUS;
              const total = dados.porStatus.find((item) => item.status === status)?.total ?? 0;
              return (
                <li key={status}>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <ChipStatus status={status} />
                    <span className="tabular-nums font-semibold text-slate-700">{total}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cx("h-full rounded-full", CONFIG_STATUS[status].dot)}
                      style={{ width: `${(total / maiorStatus) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card titulo="Interessados mais recorrentes" subtitulo="Quem mais aparece nos expedientes">
          {dados.porInteressado.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum interessado informado.</p>
          ) : (
            <ul className="space-y-3">
              {dados.porInteressado.map((item) => (
                <li key={item.chave}>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="truncate pr-2 font-medium text-slate-700">{item.chave}</span>
                    <span className="tabular-nums font-semibold text-slate-700">{item.total}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-700"
                      style={{ width: `${(item.total / maiorInteressado) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Alertas de prazo"
          subtitulo="Documentos aguardando retorno com prazo atingido"
          espacamento="p-0"
          acoes={
            <Link href="/documentos" className="text-xs font-medium text-brand-700 hover:underline">
              ver acervo
            </Link>
          }
        >
          {dados.alertas.length === 0 ? (
            <div className="p-5">
              <EmptyState titulo="Nenhum prazo estourado" descricao="Todos os prazos de resposta estão dentro do tempo previsto." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dados.alertas.map((documento) => {
                const prazo = textoPrazo(documento.prazoResposta);
                return (
                  <li key={documento.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/documentos/${documento.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                        {documento.numero}
                      </Link>
                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                          prazo.tom === "vencido"
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : "bg-amber-50 text-amber-700 ring-amber-200",
                        )}
                      >
                        {prazo.texto}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{documento.assunto}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {documento.interessado ?? documento.destinatarioNome ?? "Interessado não informado"} · prazo{" "}
                      {formatarData(documento.prazoResposta)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card
        titulo="Últimos registros"
        subtitulo="Documentos cadastrados ou sincronizados mais recentemente"
        espacamento="p-0"
        acoes={
          <Link href="/documentos" className="text-xs font-medium text-brand-700 hover:underline">
            ver todos
          </Link>
        }
      >
        {dados.recentes.length === 0 ? (
          <div className="p-5">
            <EmptyState
              titulo="Sem documentos cadastrados"
              descricao="Cadastre o primeiro expediente ou sincronize a base oficial para acompanhar numeração, prazos e movimentações."
              acao={
                <Link href="/documentos/novo" className={cx(botaoClasses("primario"), "mt-2")}>
                  Cadastrar documento
                </Link>
              }
            />
          </div>
        ) : (
          <TabelaDocumentos documentos={dados.recentes} compacta />
        )}
      </Card>
    </div>
  );
}

type TipoChave = (typeof TIPOS_DOCUMENTO)[number];
