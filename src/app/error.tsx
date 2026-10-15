"use client";

import Link from "next/link";
import { botaoClasses } from "@/components/ui";

export default function ErroAplicacao({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const mensagem = error.message || "Erro inesperado no servidor.";
  const semBanco = /DATABASE_URL|ErroBanco|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|SSL|relation .* does not exist/i.test(
    mensagem,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-10">
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Falha ao carregar</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-rose-900">
          O servidor não conseguiu concluir esta página
        </h1>
        <p className="mt-2 text-sm text-rose-800">
          {semBanco
            ? "A conexão com o banco de dados falhou. Veja abaixo as causas mais comuns e o diagnóstico completo."
            : mensagem}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-white/80 px-3 py-2 font-mono text-[11px] text-rose-900">
          {mensagem}
          {error.digest ? `\n[dígito: ${error.digest}]` : ""}
        </pre>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={reset} className={botaoClasses("primario")}>
            Tentar novamente
          </button>
          <Link href="/diagnostico" className={botaoClasses("secundario")}>
            Abrir diagnóstico
          </Link>
          <a href="/api/health" className={botaoClasses("fantasma")} target="_blank" rel="noreferrer">
            /api/health
          </a>
        </div>
      </div>

      {semBanco && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-700">
          <h2 className="text-sm font-semibold text-slate-900">Causas mais comuns em produção (Vercel)</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-[13px]">
            <li>
              <strong>Variáveis de ambiente não cadastradas.</strong> O Vercel não lê os arquivos{" "}
              <code>.env</code> do repositório. Cadastre <code>DATABASE_URL</code>, <code>SUPABASE_URL</code> e{" "}
              <code>SUPABASE_ANON_KEY</code> em <em>Project → Settings → Environment Variables</em> e faça um novo
              deploy.
            </li>
            <li>
              <strong>Conexão direta do Supabase (IPv6).</strong> O host <code>db.&lt;ref&gt;.supabase.co</code> é
              IPv6-only; funções serverless não o alcançam. Use o <em>Pooler</em>:{" "}
              <code>aws-0-&lt;região&gt;.pooler.supabase.com:6543</code> com{" "}
              <code>?pgbouncer=true</code>.
            </li>
            <li>
              <strong>SSL obrigatório.</strong> Servidores gerenciados exigem criptografia — remova{" "}
              <code>?sslmode=disable</code> da URL.
            </li>
            <li>
              <strong>Tabelas não criadas no banco de produção — a causa mais comum em banco novo.</strong> O app
              conecta, mas não encontra as tabelas (<code>relation &quot;configuracoes&quot; does not exist</code>). Rode{" "}
              <code>npx drizzle-kit push --config drizzle.prod.config.ts</code> com a <code>DATABASE_URL</code> de
              produção, ou cole <code>supabase/schema.sql</code> no SQL Editor do Supabase.
            </li>
            <li>
              <strong>Arquivo <code>.env</code> enviado no deploy.</strong> O Next.js lê o <code>.env</code> também em
              produção; apontando para <code>127.0.0.1</code>, o banco fica inacessível na nuvem. O{" "}
              <code>.gitignore</code> já ignora <code>.env</code> — remova-o do repositório e cadastre as variáveis no
              painel.
            </li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            Passo a passo completo em <code>DEPLOY.md</code> (seção &ldquo;Erros comuns&rdquo;).
          </p>
        </div>
      )}
    </div>
  );
}
