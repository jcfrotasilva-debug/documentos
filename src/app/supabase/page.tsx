import Link from "next/link";
import { ImportadorSupabase } from "@/components/ImportadorSupabase";
import { Card, StatCard, botaoClasses, cx } from "@/components/ui";
import { formatarDataHora } from "@/lib/format";
import { analisarBaseOficial, descricaoMovimentacao, descricaoTipo, ultimasSincronizacoes } from "@/lib/services/importacao";

export const dynamic = "force-dynamic";

export default async function SupabasePage() {
  const [analise, historico] = await Promise.all([analisarBaseOficial(), ultimasSincronizacoes(6)]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Integração</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Base oficial (Supabase)</h1>
          <p className="mt-1 text-sm text-slate-500">
            Estrutura identificada na base oficial e espelhamento do acervo legado para o controle local de expedientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/documentos" className={botaoClasses("secundario")}>
            Ver acervo
          </Link>
          <Link href="/configuracoes" className={botaoClasses("secundario")}>
            Numeração
          </Link>
        </div>
      </div>

      {!analise.configurada && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {analise.erro}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registros na base oficial"
          valor={analise.documentos.total}
          tom="indigo"
          icone="☁"
          apoio={analise.endereco ?? "não conectado"}
        />
        <StatCard
          label="Já espelhados aqui"
          valor={analise.importacao.jaImportados}
          tom="emerald"
          icone="⇄"
          apoio="Registros vinculados ao id de origem"
        />
        <StatCard
          label="Pendentes de importação"
          valor={analise.importacao.pendentes}
          tom="amber"
          icone="!"
          apoio="Diferença entre base oficial e acervo local"
        />
        <StatCard
          label="Última sincronização"
          valor={
            analise.importacao.ultimaSincronizacao
              ? formatarDataHora(analise.importacao.ultimaSincronizacao.criadoEm)
              : "—"
          }
          tom="slate"
          icone="↻"
          apoio={
            analise.importacao.ultimaSincronizacao
              ? `${analise.importacao.ultimaSincronizacao.importados} novo(s), ${analise.importacao.ultimaSincronizacao.atualizados} atualizado(s)`
              : "Nenhuma execução registrada"
          }
        />
      </div>

      <ImportadorSupabase configurada={analise.configurada} pendentes={analise.importacao.pendentes} />

      <Card
        titulo="Estrutura de tabelas identificada"
        subtitulo="Colunas, tipos inferidos a partir de amostra de 50 linhas e permissões do papel anon"
        espacamento="p-0"
      >
        <div className="divide-y divide-slate-100">
          {analise.tabelas.map((tabela) => (
            <div key={tabela.nome} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-800">{tabela.nome}</p>
                  <p className="text-xs text-slate-500">{tabela.descricao}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                    {tabela.linhas ?? 0} linha(s)
                  </span>
                  {tabela.permissoes.length > 0 && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                      {tabela.permissoes.join(" · ")}
                    </span>
                  )}
                </div>
              </div>

              {tabela.erro && <p className="mt-2 text-xs text-rose-600">{tabela.erro}</p>}

              {tabela.colunas.length > 0 && (
                <div className="mt-3 overflow-x-auto scroll-fino">
                  <table className="w-full min-w-[620px] text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left uppercase tracking-wider text-slate-500">
                        <th className="py-1.5 pr-4 font-semibold">Coluna</th>
                        <th className="py-1.5 pr-4 font-semibold">Tipo inferido</th>
                        <th className="py-1.5 pr-4 font-semibold">Exemplo</th>
                        <th className="py-1.5 font-semibold">Vazios (amostra)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tabela.colunas.map((coluna) => (
                        <tr key={coluna.nome}>
                          <td className="py-1.5 pr-4 font-mono text-[11px] text-slate-700">{coluna.nome}</td>
                          <td className="py-1.5 pr-4 text-slate-600">{coluna.tipo}</td>
                          <td className="py-1.5 pr-4 text-slate-500">{coluna.exemplo || "—"}</td>
                          <td className="py-1.5 tabular-nums text-slate-500">{coluna.vazios}/50</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card titulo="Composição da base oficial" subtitulo="Distribuição por movimentação e espécie" className="xl:col-span-2">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Por movimentação</p>
              <ul className="mt-2 space-y-2">
                {analise.documentos.porMovimentacao.map((item) => (
                  <li key={item.chave} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                    <span className="text-slate-700">{descricaoMovimentacao(item.movimentacao, item.chave)}</span>
                    <span className="tabular-nums font-semibold text-slate-800">{item.total}</span>
                  </li>
                ))}
                {analise.documentos.porMovimentacao.length === 0 && (
                  <li className="text-xs text-slate-500">Sem dados legíveis.</li>
                )}
              </ul>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Por espécie</p>
              <ul className="mt-2 space-y-2">
                {analise.documentos.porTipo.map((item) => (
                  <li key={item.chave} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                    <span className="text-slate-700">
                      {descricaoTipo(item.tipo, item.chave)}
                      {!item.tipo && <span className="ml-1 text-amber-600">(sem correspondência)</span>}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-800">{item.total}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Exercícios</p>
              <ul className="mt-2 space-y-2">
                {analise.documentos.porAno.map((item) => (
                  <li key={item.ano} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                    <span className="text-slate-700">{item.ano}</span>
                    <span className="tabular-nums font-semibold text-slate-800">{item.total}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-600">
                Competência lida: <strong>{analise.documentos.competencia.de ?? "—"}</strong> até{" "}
                <strong>{analise.documentos.competencia.ate ?? "—"}</strong>
              </p>
              {analise.documentos.datasInvalidas.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                    Datas com anotações ({analise.documentos.datasInvalidas.length})
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-amber-800">
                    {analise.documentos.datasInvalidas.slice(0, 4).map((item) => (
                      <li key={item.id} className="truncate">
                        {item.data} → {item.sugestao ?? "não interpretada"}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[11px] text-amber-700">
                    A data é extraída e o texto adicional é preservado nas observações.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card titulo="Contadores oficiais" subtitulo="Chave EXPEDIÇÃO/RECEBIMENTO + espécie + exercício" espacamento="p-0">
          <div className="overflow-x-auto scroll-fino">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 font-semibold">Chave</th>
                  <th className="px-3 py-2 font-semibold">Mapeamento</th>
                  <th className="px-4 py-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analise.contadores.map((contador) => (
                  <tr key={contador.chave}>
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-700">{contador.chave}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {contador.movimentacao ? descricaoMovimentacao(contador.movimentacao, "") : "?"} ·{" "}
                      {contador.tipo ? descricaoTipo(contador.tipo, "") : "?"} · {contador.ano ?? "?"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-800">{contador.valor}</td>
                  </tr>
                ))}
                {analise.contadores.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-slate-500" colSpan={3}>
                      Nenhum contador legível.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card titulo="Histórico de sincronizações" subtitulo="Últimas execuções registradas" espacamento="p-0">
        {historico.length === 0 ? (
          <p className="px-5 py-4 text-xs text-slate-500">Nenhuma sincronização executada ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historico.map((registro) => (
              <li key={registro.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs">
                <span className="text-slate-600">
                  <strong className="text-slate-800">{formatarDataHora(registro.criadoEm)}</strong> — {registro.tabelas}
                </span>
                <span className="flex items-center gap-3 tabular-nums text-slate-600">
                  <span>analisados {registro.analisados}</span>
                  <span className="text-emerald-700">novos {registro.importados}</span>
                  <span className="text-indigo-700">atualizados {registro.atualizados}</span>
                  <span className={cx(registro.ignorados > 0 && "text-rose-600")}>ignorados {registro.ignorados}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
