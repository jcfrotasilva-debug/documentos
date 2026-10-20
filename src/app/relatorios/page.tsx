import { BotaoImprimir } from "@/components/BotaoImprimir";
import { FiltrosRelatorio } from "@/components/FiltrosRelatorio";
import { TabelaDocumentos } from "@/components/TabelaDocumentos";
import { Timbre } from "@/components/impressao/Timbre";
import { Card, StatCard, cx } from "@/components/ui";
import { CONFIG_MEIO, CONFIG_STATUS, CONFIG_TIPO } from "@/lib/domain";
import { parseFiltros } from "@/lib/filters";
import { formatarData } from "@/lib/format";
import {
  anosDisponiveis,
  buscarConfiguracao,
  listarDocumentos,
  relatorioPeriodo,
} from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function RelatoriosPage({ searchParams }: Props) {
  const params = await searchParams;
  const filtros = parseFiltros({ ...params, pageSize: "20" });

  const [relatorio, resultado, anos] = await Promise.all([
    relatorioPeriodo(filtros),
    listarDocumentos({ ...filtros, pageSize: 20 }),
    anosDisponiveis(),
  ]);

  const maiorTipo = Math.max(1, ...relatorio.porTipo.map((item) => item.total));
  const maiorInteressado = Math.max(1, ...relatorio.porInteressado.map((item) => item.total));
  const maiorMes = Math.max(1, ...relatorio.porMes.map((item) => item.total));
  const periodo =
    filtros.de || filtros.ate
      ? `${filtros.de ? formatarData(filtros.de) : "início"} até ${filtros.ate ? formatarData(filtros.ate) : "hoje"}`
      : "todo o acervo";

  const config = await buscarConfiguracao();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="no-print">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Relatórios analíticos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consolidado de expedição por período, espécie documental, meio de envio e responsável.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <BotaoImprimir />
        </div>
      </div>

      <div className="print-only hidden print:block">
        <Timbre config={config} className="mb-6" />
        <h1 className="text-center text-lg font-bold uppercase tracking-wide">Relatório de Expedientes</h1>
        <p className="mt-1 text-center text-sm text-slate-600">Período: {periodo}</p>
      </div>

      <FiltrosRelatorio
        valores={{
          de: filtros.de ?? "",
          ate: filtros.ate ?? "",
          tipo: filtros.tipo ?? "TODOS",
          status: filtros.status ?? "TODOS",
          ano: filtros.ano ? String(filtros.ano) : "TODOS",
        }}
        anos={anos}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Documentos no período" valor={relatorio.total} tom="indigo" icone="▤" apoio={periodo} />
        <StatCard label="Páginas expedidas" valor={relatorio.paginas} tom="sky" icone="≡" apoio="Somatório de páginas" />
        <StatCard
          label="Tipos distintos"
          valor={relatorio.porTipo.length}
          tom="emerald"
          icone="◫"
          apoio="Espécies documentais movimentadas"
        />
        <StatCard
          label="Unidades de destino"
          valor={relatorio.porInteressado.length}
          tom="amber"
          icone="◎"
          apoio="Interessados distintos no período"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card titulo="Por espécie documental" subtitulo="Volume e participação">
          <ul className="space-y-3">
            {relatorio.porTipo.length === 0 && <li className="text-xs text-slate-500">Sem dados no período.</li>}
            {relatorio.porTipo.map((item) => (
              <li key={item.chave}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{CONFIG_TIPO[item.chave]?.label ?? item.chave}</span>
                  <span className="tabular-nums text-slate-600">{item.total}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cx("h-full rounded-full", CONFIG_TIPO[item.chave]?.cor ?? "bg-slate-500")}
                    style={{ width: `${(item.total / maiorTipo) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card titulo="Por situação" subtitulo="Posição de tramitação no período">
          <ul className="space-y-2">
            {relatorio.porStatus.length === 0 && <li className="text-xs text-slate-500">Sem dados no período.</li>}
            {relatorio.porStatus.map((item) => (
              <li key={item.chave} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                <span className="text-slate-700">{CONFIG_STATUS[item.chave]?.label ?? item.chave}</span>
                <span className="tabular-nums font-semibold text-slate-800">{item.total}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Meio de envio</h3>
          <ul className="mt-2 space-y-2">
            {relatorio.porMeio.map((item) => (
              <li key={item.chave} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                <span className="text-slate-700">{CONFIG_MEIO[item.chave] ?? item.chave}</span>
                <span className="tabular-nums font-semibold text-slate-800">{item.total}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card titulo="Por interessado" subtitulo="Interessados que mais aparecem no período">
          <ul className="space-y-3">
            {relatorio.porInteressado.length === 0 && (
              <li className="text-xs text-slate-500">Sem dados no período.</li>
            )}
            {relatorio.porInteressado.map((item) => (
              <li key={item.chave}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate pr-2 font-medium text-slate-700">{item.chave}</span>
                  <span className="tabular-nums text-slate-600">{item.total}</span>
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
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card titulo="Série mensal" subtitulo="Expedições por mês no período filtrado">
          {relatorio.porMes.length === 0 ? (
            <p className="text-xs text-slate-500">Sem dados no período.</p>
          ) : (
            <div className="flex h-48 items-end gap-3">
              {relatorio.porMes.map((item) => {
                const [ano, mes] = item.chave.split("-");
                return (
                  <div key={item.chave} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500">{item.total}</span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-slate-700 to-slate-500"
                      style={{ height: `${Math.max(4, (item.total / maiorMes) * 100)}%` }}
                    />
                    <span className="text-[10px] text-slate-500">
                      {MESES[Number(mes) - 1]}/{ano.slice(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card titulo="Por responsável" subtitulo="Quem mais expediu no período">
          <ul className="space-y-2">
            {relatorio.porResponsavel.length === 0 && <li className="text-xs text-slate-500">Sem dados no período.</li>}
            {relatorio.porResponsavel.map((item) => (
              <li key={item.chave} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                <span className="text-slate-700">{item.chave}</span>
                <span className="tabular-nums font-semibold text-slate-800">{item.total}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        titulo="Detalhamento"
        subtitulo="Primeiros 20 registros do período filtrado — use o CSV para o extrato completo"
        espacamento="p-0"
      >
        <TabelaDocumentos documentos={resultado.linhas} />
      </Card>
    </div>
  );
}
