import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

/**
 * Conexão com o PostgreSQL.
 *
 * Regras importantes para ambientes serverless (Vercel, etc.):
 *  - Nada é lançado no carregamento do módulo. Se DATABASE_URL estiver ausente ou
 *    inválida, o erro só aparece na primeira consulta, com mensagem explicativa
 *    (um throw no import derruba o app inteiro antes de qualquer try/catch).
 *  - SSL é ativado automaticamente para hosts remotos (Supabase/Neon exigem SSL).
 *  - O pool é reutilizado via globalThis para não abrir conexões a cada invocação.
 */

const globalForDb = globalThis as typeof globalThis & {
  __sicedPool?: Pool;
};

export const DATABASE_URL = process.env.DATABASE_URL?.trim() ?? "";
export const bancoConfigurado = DATABASE_URL.length > 0;

export const MENSAGEM_SEM_URL =
  "DATABASE_URL não está definida neste ambiente. Configure a variável na Vercel (Project → Settings → Environment Variables) ou no .env local.";

export const MENSAGEM_URL_INVALIDA =
  "DATABASE_URL não é uma URL PostgreSQL válida. Use o formato postgresql://usuario:senha@host:porta/banco.";

export class ErroBanco extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroBanco";
  }
}

export const MENSAGEM_VARIAVEIS =
  "No Vercel.js NÃO são lidos os arquivos .env do repositório: cadastre DATABASE_URL, SUPABASE_URL e SUPABASE_ANON_KEY em Project → Settings → Environment Variables e faça um novo deploy.";

function ehLocal(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
}

export type InfoConexao = {
  configurado: boolean;
  host: string | null;
  porta: number | null;
  banco: string | null;
  usuario: string | null;
  ssl: boolean;
  viaPooler: boolean;
  ipv6Direto: boolean;
  localEmNuvem: boolean;
  origem: "DATABASE_URL" | "ausente";
};

/** Detecta execução em plataforma serverless/nuvem (Vercel, Netlify, etc.). */
export function emNuvem(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_URL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.RENDER,
  );
}

export const MENSAGEM_LOCALHOST_EM_NUVEM =
  "A DATABASE_URL aponta para localhost (127.0.0.1), que só existe na sua máquina. Em produção, cadastre a Connection Pooler do Supabase em Project → Settings → Environment Variables (e remova o arquivo .env do deploy: ele é lido pelo Next.js e sobrescreve o valor do painel).";

export function infoConexao(): InfoConexao {
  const base: InfoConexao = {
    configurado: bancoConfigurado,
    host: null,
    porta: null,
    banco: null,
    usuario: null,
    ssl: false,
    viaPooler: false,
    ipv6Direto: false,
    localEmNuvem: false,
    origem: bancoConfigurado ? "DATABASE_URL" : "ausente",
  };
  if (!bancoConfigurado) return base;

  try {
    const url = new URL(DATABASE_URL);
    const host = url.hostname;
    const porta = url.port ? Number(url.port) : 5432;
    const local = ehLocal(host);
    const sslDesativado = (url.searchParams.get("sslmode") ?? "").toLowerCase() === "disable";
    return {
      configurado: true,
      host,
      porta,
      banco: url.pathname.replace(/^\//, "") || null,
      usuario: url.username || null,
      ssl: !local && !sslDesativado,
      viaPooler: host.includes("pooler.supabase.com") || porta === 6543,
      /* Conexão direta do Supabase é IPv6-only por padrão: inalcançável de funções IPv4. */
      ipv6Direto: host.endsWith(".supabase.co") && !host.includes("pooler"),
      /* URL local sendo usada em produção: erro clássico do arquivo .env enviado no deploy. */
      localEmNuvem: local && emNuvem(),
      origem: "DATABASE_URL",
    };
  } catch {
    return base;
  }
}

function configPool(): PoolConfig {
  if (!bancoConfigurado) throw new ErroBanco(MENSAGEM_SEM_URL);

  let url: URL;
  try {
    url = new URL(DATABASE_URL);
  } catch {
    throw new ErroBanco(MENSAGEM_URL_INVALIDA);
  }

  const local = ehLocal(url.hostname);
  const sslDesativado = (url.searchParams.get("sslmode") ?? "").toLowerCase() === "disable";
  const max = Number(process.env.PGPOOL_MAX ?? (local ? 10 : 3));

  return {
    connectionString: DATABASE_URL,
    /* Servidor gerenciado (Supabase/Neon/Railway) exige SSL. */
    ssl: !local && !sslDesativado ? { rejectUnauthorized: false } : undefined,
    max: Number.isFinite(max) && max > 0 ? max : 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    application_name: "siced",
  };
}

function obterPool(): Pool {
  if (globalForDb.__sicedPool) return globalForDb.__sicedPool;
  const pool = new Pool(configPool());
  pool.on("error", (erro) => {
    console.error("[siced] erro inesperado no pool do PostgreSQL:", erro.message);
  });
  globalForDb.__sicedPool = pool;
  return pool;
}

let cacheDb: NodePgDatabase<Record<string, never>> | null = null;

function obterDb(): NodePgDatabase<Record<string, never>> {
  if (cacheDb) return cacheDb;
  cacheDb = drizzle(obterPool(), { logger: process.env.DEBUG_SQL === "true" });
  return cacheDb;
}

/**
 * Proxy preguiçoso: cada acesso (`db.select`, `db.transaction`, ...) resolve o
 * pool nesta chamada. Sem DATABASE_URL, o erro chega como ErroBanco tratável.
 */
export const db = new Proxy({} as NodePgDatabase<Record<string, never>>, {
  get(_alvo, propriedade) {
    const real = obterDb() as unknown as Record<PropertyKey, unknown>;
    const valor = real[propriedade as keyof typeof real];
    return typeof valor === "function" ? (valor as (...args: unknown[]) => unknown).bind(real) : valor;
  },
}) as NodePgDatabase<Record<string, never>>;

/** Pool exposto apenas para encerramento/inspeção (healthcheck). */
export function poolAtual(): Pool | null {
  if (!bancoConfigurado) return null;
  try {
    return obterPool();
  } catch {
    return null;
  }
}

export type DiagnosticoBanco = {
  configurado: boolean;
  conectado: boolean;
  latenciaMs: number | null;
  tabelas: { nome: string; existe: boolean }[];
  faltando: string[];
  erro: string | null;
  dica: string | null;
};

const TABELAS_ESPERADAS = ["documentos", "setores", "numeracao", "configuracoes", "sincronizacoes"];

export async function diagnosticarBanco(): Promise<DiagnosticoBanco> {
  const info = infoConexao();
  const resultado: DiagnosticoBanco = {
    configurado: info.configurado,
    conectado: false,
    latenciaMs: null,
    tabelas: TABELAS_ESPERADAS.map((nome) => ({ nome, existe: false })),
    faltando: [],
    erro: null,
    dica: null,
  };

  if (!info.configurado) {
    resultado.erro = MENSAGEM_SEM_URL;
    resultado.dica = MENSAGEM_VARIAVEIS;
    resultado.faltando = [...TABELAS_ESPERADAS];
    return resultado;
  }

  if (info.localEmNuvem) {
    resultado.erro = MENSAGEM_LOCALHOST_EM_NUVEM;
    resultado.dica =
      "Cadastre DATABASE_URL no painel da hospedagem (Production e Preview), remova o arquivo .env do repositório (.gitignore já configurado) e faça um novo deploy.";
    resultado.faltando = [...TABELAS_ESPERADAS];
    return resultado;
  }

  const inicio = Date.now();
  const pool = poolAtual();
  if (!pool) {
    resultado.erro = MENSAGEM_URL_INVALIDA;
    return resultado;
  }

  try {
    const { rows } = await pool.query<{ nome: string }>(
      "select table_name as nome from information_schema.tables where table_schema = 'public'",
    );
    resultado.conectado = true;
    resultado.latenciaMs = Date.now() - inicio;
    const existentes = new Set(rows.map((linha) => linha.nome));
    resultado.tabelas = TABELAS_ESPERADAS.map((nome) => ({ nome, existe: existentes.has(nome) }));
    resultado.faltando = resultado.tabelas.filter((tabela) => !tabela.existe).map((tabela) => tabela.nome);
    if (resultado.faltando.length > 0) {
      resultado.dica =
        "Conexão OK, mas as tabelas do SICED ainda não existem neste banco. Rode `npx drizzle-kit push` apontando DATABASE_URL para este banco, ou execute o conteúdo de supabase/schema.sql no SQL Editor.";
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    resultado.erro = mensagem;
    if (/ECONNREFUSED/i.test(mensagem) && info.host && ehLocal(info.host)) {
      resultado.dica = MENSAGEM_LOCALHOST_EM_NUVEM;
    } else if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH/i.test(mensagem)) {
      resultado.dica = info.ipv6Direto
        ? "O host é a conexão DIRETA do Supabase (IPv6). Em funções serverless (Vercel) use o Pooler: postgresql://postgres.<ref>:<SENHA>@aws-0-<região>.pooler.supabase.com:6543/postgres?pgbouncer=true"
        : "Host inacessível a partir deste ambiente. Confira o host/porta e se o banco aceita conexões externas.";
    } else if (/SSL|pg_hba|no encryption/i.test(mensagem)) {
      resultado.dica =
        "Falha de SSL: o servidor exige conexão criptografada. Remova ?sslmode=disable da DATABASE_URL (o app ativa SSL automaticamente para hosts remotos).";
    } else if (/password|authentication|role .* does not exist/i.test(mensagem)) {
      resultado.dica = "Usuário ou senha incorretos. Copie a connection string atualizada em Supabase → Project Settings → Database.";
    } else if (/does not exist/i.test(mensagem)) {
      resultado.dica = "Banco inexistente ou sem permissão. Confira o nome do banco no final da URL.";
    }
  }
  return resultado;
}
