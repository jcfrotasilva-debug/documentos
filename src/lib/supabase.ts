/**
 * Cliente REST para a base oficial no Supabase.
 * As credenciais são lidas exclusivamente de variáveis de ambiente:
 *   SUPABASE_URL        — https://<projeto>.supabase.co
 *   SUPABASE_ANON_KEY   — chave publicável (anon) do projeto
 *   SUPABASE_TABELAS    — tabelas expostas para introspecção (lista separada por vírgula)
 */

export type TabelaRemota = { nome: string; descricao: string };

export const TABELAS_PADRAO: TabelaRemota[] = [
  { nome: "documentos", descricao: "Registro de expedientes (expedição e recebimento)" },
  { nome: "contadores", descricao: "Contadores de numeração por movimentação, espécie e exercício" },
];

export function supabaseUrl(): string | null {
  const url = process.env.SUPABASE_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export function supabaseChave(): string | null {
  return process.env.SUPABASE_ANON_KEY?.trim() || null;
}

export function supabaseConfigurada(): boolean {
  return Boolean(supabaseUrl() && supabaseChave());
}

export function tabelasAlvo(): TabelaRemota[] {
  const lista = process.env.SUPABASE_TABELAS?.trim();
  if (!lista) return TABELAS_PADRAO;
  const nomes = lista
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (nomes.length === 0) return TABELAS_PADRAO;
  return nomes.map((nome) => ({
    nome,
    descricao: TABELAS_PADRAO.find((t) => t.nome === nome)?.descricao ?? "Tabela da base oficial",
  }));
}

export class SupabaseNaoConfigurado extends Error {
  constructor() {
    super("Integração com o Supabase não configurada (SUPABASE_URL / SUPABASE_ANON_KEY ausentes).");
    this.name = "SupabaseNaoConfigurado";
  }
}

function cabecalhos(chave: string, extra: Record<string, string> = {}) {
  return {
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export type RespostaSupabase<T> = {
  ok: boolean;
  status: number;
  dados: T | null;
  total: number | null;
  erro: string | null;
};

export async function consultar<T>(
  tabela: string,
  params: Record<string, string> = {},
  extras: Record<string, string> = {},
): Promise<RespostaSupabase<T>> {
  const url = supabaseUrl();
  const chave = supabaseChave();
  if (!url || !chave) throw new SupabaseNaoConfigurado();

  const querystring = new URLSearchParams(params).toString();
  const resposta = await fetch(`${url}/rest/v1/${tabela}${querystring ? `?${querystring}` : ""}`, {
    headers: cabecalhos(chave, { Prefer: "count=exact", ...extras }),
    cache: "no-store",
  });

  const totalHeader = resposta.headers.get("content-range");
  const total = totalHeader?.includes("/") ? Number(totalHeader.split("/")[1]) : null;

  if (!resposta.ok) {
    let erro = `HTTP ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { message?: string; hint?: string };
      erro = corpo.message ?? erro;
      if (corpo.hint) erro = `${erro} (${corpo.hint})`;
    } catch {
      /* mantém o erro padrão */
    }
    return { ok: false, status: resposta.status, dados: null, total, erro };
  }

  const dados = (await resposta.json()) as T;
  return { ok: true, status: resposta.status, dados, total: Number.isFinite(total) ? total : null, erro: null };
}

export async function buscarTodasLinhas<T>(tabela: string, ordem = "created_at.asc"): Promise<T[]> {
  const url = supabaseUrl();
  const chave = supabaseChave();
  if (!url || !chave) throw new SupabaseNaoConfigurado();

  const linhas: T[] = [];
  const tamanho = 1000;
  for (let inicio = 0; inicio < 50000; inicio += tamanho) {
    const resposta = await fetch(`${url}/rest/v1/${tabela}?select=*&order=${ordem}`, {
      headers: cabecalhos(chave, { Range: `${inicio}-${inicio + tamanho - 1}` }),
      cache: "no-store",
    });
    if (!resposta.ok) {
      throw new Error(`Falha ao ler ${tabela} na base oficial (HTTP ${resposta.status})`);
    }
    const lote = (await resposta.json()) as T[];
    linhas.push(...lote);
    if (lote.length < tamanho) break;
  }
  return linhas;
}

export async function permissoesTabela(tabela: string): Promise<string[]> {
  const url = supabaseUrl();
  const chave = supabaseChave();
  if (!url || !chave) throw new SupabaseNaoConfigurado();
  try {
    const resposta = await fetch(`${url}/rest/v1/${tabela}?select=*&limit=1`, {
      method: "OPTIONS",
      headers: cabecalhos(chave),
      cache: "no-store",
    });
    const allow = resposta.headers.get("allow");
    return allow ? allow.split(",").map((item) => item.trim()) : [];
  } catch {
    return [];
  }
}

export function inferirTipo(valor: unknown): string {
  if (valor === null || valor === undefined) return "desconhecido";
  if (typeof valor === "number") return Number.isInteger(valor) ? "inteiro" : "decimal";
  if (typeof valor === "boolean") return "booleano";
  if (Array.isArray(valor)) return "lista";
  if (typeof valor === "object") return "objeto";
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}T/.test(texto)) return "data-hora";
  if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) return "data (dd/mm/aaaa)";
  if (/^-?\d+$/.test(texto)) return "numérico (texto)";
  return "texto";
}

/** Extrai a data no formato dd/mm/aaaa e devolve eventuais anotações anexadas. */
export function separarDataLegada(valor: string | null): { iso: string | null; anotacao: string | null } {
  if (!valor) return { iso: null, anotacao: null };
  const encontrado = valor.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!encontrado) return { iso: null, anotacao: valor.trim() || null };
  const [, dia, mes, ano] = encontrado;
  const iso = `${ano}-${mes}-${dia}`;
  const resto = valor.replace(encontrado[0], "").replace(/^[\s\-–—:]+/, "").trim();
  return { iso, anotacao: resto || null };
}
