import type { DiagnosticoBanco, InfoConexao } from "@/db";

/**
 * Tela de indisponibilidade do banco, renderizada pelo servidor.
 * Aparece antes de qualquer JavaScript: no lugar do "server error" genérico,
 * o operador recebe a causa exata e o caminho da correção.
 */
export function DiagnosticoFalha({
  banco,
  conexao,
  ambiente,
}: {
  banco: DiagnosticoBanco;
  conexao: InfoConexao;
  ambiente: string;
}) {
  const checklist = [
    {
      titulo: "Variáveis de ambiente no painel",
      texto:
        "O Vercel não lê os arquivos .env do repositório. Cadastre DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY e HABILITAR_DADOS_DEMO=false em Project → Settings → Environment Variables (Production e Preview) e faça um novo deploy.",
    },
    {
      titulo: "Use o Pooler do Supabase (IPv4)",
      texto:
        "A conexão direta (db.<ref>.supabase.co) é IPv6-only e não é alcançável por funções serverless. Use postgresql://postgres.<ref>:<SENHA>@aws-0-<região>.pooler.supabase.com:6543/postgres?pgbouncer=true",
    },
    {
      titulo: "Remova o .env do deploy",
      texto:
        "O Next.js carrega .env também em produção. Se ele aponta para 127.0.0.1, o banco fica inacessível na nuvem. Rode git rm --cached .env — o .gitignore do projeto já o ignora.",
    },
    {
      titulo: "Crie a estrutura no banco de produção",
      texto:
        "Banco novo e vazio é a causa mais comum: o app conecta, mas não encontra as tabelas (relation \"configuracoes\" does not exist). Rode npx drizzle-kit push --config drizzle.prod.config.ts com a DATABASE_URL de produção, ou cole supabase/schema.sql no SQL Editor do Supabase (script idempotente, roda quantas vezes precisar).",
    },
    {
      titulo: "Prefira o pooler de transação (6543)",
      texto:
        "Em serverless, a porta 6543 com ?pgbouncer=true evita esgotamento do pool de conexões (erros \"Max client connections reached\"). A porta 5432 é o pooler de sessão, com limite menor.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">SICED · banco de dados indisponível</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-rose-900">
          O sistema não conseguiu conectar ao PostgreSQL
        </h1>
        <p className="mt-2 text-sm text-rose-800">
          Esta tela é gerada pelo servidor antes de qualquer JavaScript, para você identificar o problema imediatamente.
        </p>
        <dl className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ambiente</dt>
            <dd className="text-slate-800">{ambiente}</dd>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">URL configurada</dt>
            <dd className="text-slate-800">
              {conexao.configurado ? `${conexao.usuario ?? "?"}@${conexao.host}:${conexao.porta}` : "ausente"}
            </dd>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">SSL / pooler</dt>
            <dd className="text-slate-800">
              {conexao.ssl ? "SSL automático" : "sem SSL"} ·{" "}
              {conexao.modoPooler === "transacao"
                ? "pooler (transação 6543)"
                : conexao.modoPooler === "sessao"
                  ? "pooler (sessão 5432)"
                  : "conexão direta"}
            </dd>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tabelas do SICED</dt>
            <dd className="text-slate-800">
              {banco.faltando.length === 0
                ? "estrutura completa"
                : `faltando: ${banco.faltando.join(", ")}`}
            </dd>
          </div>
        </dl>
        {banco.erro && (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-rose-900">
            {banco.erro}
          </pre>
        )}
        {banco.dica && (
          <p className="mt-3 rounded-lg border border-rose-300 bg-white/80 px-3 py-2 text-[13px] text-rose-900">
            💡 {banco.dica}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <h2 className="text-sm font-semibold text-slate-900">Correção — 5 verificações, na ordem</h2>
        <ol className="mt-3 space-y-3">
          {checklist.map((item, indice) => (
            <li key={item.titulo} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {indice + 1}
              </span>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{item.titulo}</p>
                <p className="text-[12px] leading-relaxed text-slate-600">{item.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11px] text-slate-500">
          Depois de corrigir, recarregue esta página. O passo a passo completo está em <code>DEPLOY.md</code> e o estado
          do ambiente pode ser conferido em <code>/api/health</code>.
        </p>
      </div>
    </div>
  );
}
