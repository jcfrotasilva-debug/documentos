import { diagnosticarBanco, infoConexao, MENSAGEM_VARIAVEIS } from "@/db";
import { Card, StatCard, cx } from "@/components/ui";
import { supabaseConfigurada, supabaseUrl, tabelasAlvo } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function Linha({
  rotulo,
  valor,
  tom = "text-slate-800",
}: {
  rotulo: string;
  valor: React.ReactNode;
  tom?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-xs last:border-0">
      <span className="text-slate-600">{rotulo}</span>
      <span className={cx("text-right font-medium break-all", tom)}>{valor}</span>
    </div>
  );
}

export default async function DiagnosticoPage() {
  const conexao = infoConexao();
  const banco = await diagnosticarBanco();
  const pronto = banco.conectado && banco.faltando.length === 0;
  const urlOculta = conexao.configurado
    ? `${conexao.usuario ? `${conexao.usuario}:•••@` : ""}${conexao.host}:${conexao.porta}/${conexao.banco ?? ""}`
    : "não configurada";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Operação</p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Diagnóstico do ambiente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Verificação de variáveis de ambiente, conexão com o PostgreSQL, tabelas do SICED e acesso à base oficial.
          Nenhum segredo é exibido nesta página.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Banco de dados"
          valor={banco.conectado ? "Conectado" : "Sem conexão"}
          tom={banco.conectado ? "emerald" : "rose"}
          icone={banco.conectado ? "✓" : "!"}
          apoio={banco.latenciaMs !== null ? `resposta em ${banco.latenciaMs} ms` : "sem resposta"}
        />
        <StatCard
          label="URL do banco"
          valor={conexao.configurado ? "Definida" : "Ausente"}
          tom={conexao.configurado ? "sky" : "rose"}
          icone="⇄"
          apoio={urlOculta}
        />
        <StatCard
          label="Tabelas do SICED"
          valor={`${banco.tabelas.filter((t) => t.existe).length}/${banco.tabelas.length}`}
          tom={banco.faltando.length === 0 ? "indigo" : "amber"}
          icone="▤"
          apoio={banco.faltando.length === 0 ? "estrutura completa" : `faltando: ${banco.faltando.join(", ")}`}
        />
        <StatCard
          label="Base oficial"
          valor={supabaseConfigurada() ? "Configurada" : "Ausente"}
          tom={supabaseConfigurada() ? "emerald" : "slate"}
          icone="☁"
          apoio={supabaseUrl() ?? "sem URL"}
        />
      </div>

      {!pronto && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          <p className="font-semibold">Ambiente não está pronto para produção</p>
          {banco.erro && <p className="mt-1">{banco.erro}</p>}
          {banco.dica && <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-[13px]">💡 {banco.dica}</p>}
          {!conexao.configurado && <p className="mt-2 text-[13px]">{MENSAGEM_VARIAVEIS}</p>}
        </div>
      )}

      {pronto && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <p className="font-semibold">Ambiente operacional</p>
          <p className="mt-1 text-[13px]">
            Banco conectado, estrutura criada e numeração disponível. Verifique também os dados institucionais em
            Numeração e órgão antes de emitir documentos.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card titulo="Conexão com o PostgreSQL" subtitulo="Somente informações não sensíveis">
          <Linha rotulo="Origem" valor="DATABASE_URL" />
          <Linha
            rotulo="Host"
            valor={conexao.host ?? "—"}
            tom={conexao.host?.includes("pooler") ? "text-emerald-700" : "text-slate-800"}
          />
          <Linha rotulo="Porta" valor={conexao.porta ?? "—"} />
          <Linha rotulo="Banco" valor={conexao.banco ?? "—"} />
          <Linha rotulo="Usuário" valor={conexao.usuario ?? "—"} />
          <Linha
            rotulo="SSL"
            valor={conexao.ssl ? "ativado automaticamente" : "desativado"}
            tom={conexao.ssl ? "text-emerald-700" : "text-amber-700"}
          />
          <Linha
            rotulo="Via pooler"
            valor={conexao.viaPooler ? "sim (recomendado em serverless)" : "não"}
            tom={conexao.viaPooler ? "text-emerald-700" : "text-amber-700"}
          />
          <Linha
            rotulo="Ambiente"
            valor={conexao.localEmNuvem ? "nuvem" : process.env.NODE_ENV === "production" ? "produção local" : "desenvolvimento"}
          />
          {conexao.ipv6Direto && (
            <Linha
              rotulo="Atenção"
              valor="conexão direta do Supabase é IPv6 — indisponível no Vercel; use o pooler"
              tom="text-rose-700"
            />
          )}
          {conexao.localEmNuvem && (
            <Linha
              rotulo="Atenção"
              valor="DATABASE_URL aponta para localhost em ambiente de nuvem — cadastre a URL do banco no painel e remova o .env do deploy"
              tom="text-rose-700"
            />
          )}
        </Card>

        <Card titulo="Tabelas do sistema" subtitulo="Verificação em information_schema">
          {banco.tabelas.map((tabela) => (
            <div
              key={tabela.nome}
              className="flex items-center justify-between border-b border-slate-100 py-2 text-xs last:border-0"
            >
              <code className="text-slate-700">{tabela.nome}</code>
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                  tabela.existe
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-rose-50 text-rose-700 ring-rose-200",
                )}
              >
                {tabela.existe ? "criada" : "ausente"}
              </span>
            </div>
          ))}
          <p className="mt-3 text-[11px] text-slate-500">
            Criação: <code>npx drizzle-kit push</code> (com a DATABASE_URL de produção) ou o script{" "}
            <code>supabase/schema.sql</code> no SQL Editor do Supabase.
          </p>
        </Card>

        <Card titulo="Variáveis de ambiente" subtitulo="Presença das chaves (sem revelar valores)">
          {[
            ["DATABASE_URL", conexao.configurado],
            ["SUPABASE_URL", Boolean(process.env.SUPABASE_URL)],
            ["SUPABASE_ANON_KEY", Boolean(process.env.SUPABASE_ANON_KEY)],
            ["SUPABASE_TABELAS", Boolean(process.env.SUPABASE_TABELAS)],
            ["HABILITAR_DADOS_DEMO", process.env.HABILITAR_DADOS_DEMO === "true"],
          ].map(([nome, presente]) => (
            <div
              key={String(nome)}
              className="flex items-center justify-between border-b border-slate-100 py-2 text-xs last:border-0"
            >
              <code className="text-slate-700">{nome}</code>
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                  presente
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-slate-100 text-slate-500 ring-slate-200",
                )}
              >
                {presente ? "definida" : "ausente"}
              </span>
            </div>
          ))}
          <p className="mt-3 text-[11px] text-slate-500">
            Ambiente atual: <strong>{process.env.NODE_ENV}</strong>. Tabelas lidas da base oficial:{" "}
            {tabelasAlvo().map((tabela) => tabela.nome).join(", ")}.
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Deploy: <code>{process.env.VERCEL_URL ?? "local"}</code>
          </p>
        </Card>
      </div>

      <Card titulo="Checklist para o Vercel" subtitulo="Ordem recomendada de verificação">
        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-slate-700">
          <li>
            Cadastre as variáveis em <em>Project → Settings → Environment Variables</em> (Production e Preview):{" "}
            <code>DATABASE_URL</code>, <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code>,{" "}
            <code>SUPABASE_TABELAS</code>, <code>HABILITAR_DADOS_DEMO=false</code>.
          </li>
          <li>
            Na <code>DATABASE_URL</code>, use o <strong>pooler</strong> do Supabase, nunca a conexão direta:{" "}
            <code>postgresql://postgres.&lt;ref&gt;:&lt;SENHA&gt;@aws-0-&lt;região&gt;.pooler.supabase.com:6543/postgres?pgbouncer=true</code>.
          </li>
          <li>
            Crie a estrutura no banco de produção: <code>npx drizzle-kit push</code> local apontando para a URL de
            produção, ou rode <code>supabase/schema.sql</code> no SQL Editor.
          </li>
          <li>Redeploy após salvar as variáveis (elas só entram no build seguinte).</li>
          <li>
            Confirme: <code>/api/health</code> deve responder <code>{'{"ok":true}'}</code>.
          </li>
        </ol>
      </Card>
    </div>
  );
}
