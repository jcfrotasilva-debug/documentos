import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { documentos, numeracao, sincronizacoes } from "@/db/schema";
import {
  CONFIG_MOVIMENTACAO,
  CONFIG_TIPO,
  movimentacaoDoLegado,
  prefixoPadrao,
  tipoDoLegado,
  type Movimentacao,
  type TipoDocumento,
} from "@/lib/domain";
import { montarNumero } from "@/lib/format";
import {
  buscarTodasLinhas,
  consultar,
  inferirTipo,
  permissoesTabela,
  separarDataLegada,
  supabaseConfigurada,
  supabaseUrl,
  tabelasAlvo,
} from "@/lib/supabase";

export type ColunaRemota = {
  nome: string;
  tipo: string;
  exemplo: string;
  vazios: number;
};

export type TabelaAnalise = {
  nome: string;
  descricao: string;
  linhas: number | null;
  permissoes: string[];
  colunas: ColunaRemota[];
  erro: string | null;
};

export type ContadorRemoto = {
  chave: string;
  valor: number;
  movimentacao: Movimentacao | null;
  tipo: TipoDocumento | null;
  ano: number | null;
  atualizadoEm: string | null;
};

export type AnaliseBaseOficial = {
  configurada: boolean;
  endereco: string | null;
  erro: string | null;
  tabelas: TabelaAnalise[];
  contadores: ContadorRemoto[];
  documentos: {
    total: number;
    porTipo: { chave: string; tipo: TipoDocumento | null; total: number }[];
    porMovimentacao: { chave: string; movimentacao: Movimentacao | null; total: number }[];
    porAno: { ano: number; total: number }[];
    competencia: { de: string | null; ate: string | null };
    datasInvalidas: { id: string; data: string; sugestao: string | null }[];
  };
  importacao: {
    jaImportados: number;
    pendentes: number;
    ultimaSincronizacao: { criadoEm: Date; importados: number; atualizados: number; analisados: number } | null;
  };
};

export type LinhaRemota = {
  id: string;
  tipo: string;
  tipo_movimentacao: string;
  numero: number;
  ano: number;
  data: string;
  interessado: string;
  assunto: string;
  numero_processo: string | null;
  observacoes: string | null;
  created_at: string;
};

function normalizarTexto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

export function interpretarChaveContador(chave: string): {
  movimentacao: Movimentacao | null;
  tipo: TipoDocumento | null;
  ano: number | null;
} {
  const matchAno = chave.match(/_(\d{4})$/);
  const ano = matchAno ? Number(matchAno[1]) : null;
  const semAno = matchAno ? chave.slice(0, matchAno.index) : chave;
  const separador = semAno.indexOf("_");
  const movRaw = separador >= 0 ? semAno.slice(0, separador) : semAno;
  const tipoRaw = separador >= 0 ? semAno.slice(separador + 1) : "";
  return {
    movimentacao: movimentacaoDoLegado(movRaw),
    tipo: tipoDoLegado(tipoRaw),
    ano,
  };
}

export async function analisarBaseOficial(): Promise<AnaliseBaseOficial> {
  const base: AnaliseBaseOficial = {
    configurada: supabaseConfigurada(),
    endereco: supabaseUrl(),
    erro: null,
    tabelas: [],
    contadores: [],
    documentos: {
      total: 0,
      porTipo: [],
      porMovimentacao: [],
      porAno: [],
      competencia: { de: null, ate: null },
      datasInvalidas: [],
    },
    importacao: { jaImportados: 0, pendentes: 0, ultimaSincronizacao: null },
  };

  if (!base.configurada) {
    base.erro = "Configure SUPABASE_URL e SUPABASE_ANON_KEY para conectar à base oficial.";
    return base;
  }

  const [importadosDb, ultima] = await Promise.all([
    db
      .select({ total: count() })
      .from(documentos)
      .where(eq(documentos.origemExterna, "SUPABASE")),
    db.select().from(sincronizacoes).orderBy(desc(sincronizacoes.criadoEm)).limit(1),
  ]);
  base.importacao.jaImportados = Number(importadosDb[0]?.total ?? 0);
  base.importacao.ultimaSincronizacao = ultima[0]
    ? {
        criadoEm: ultima[0].criadoEm,
        importados: ultima[0].importados,
        atualizados: ultima[0].atualizados,
        analisados: ultima[0].analisados,
      }
    : null;

  for (const tabela of tabelasAlvo()) {
    const [amostra, total, permissoes] = await Promise.all([
      consultar<Record<string, unknown>[]>(tabela.nome, { select: "*", limit: "50" }),
      consultar<Record<string, unknown>[]>(tabela.nome, { select: "*", limit: "1" }),
      permissoesTabela(tabela.nome),
    ]);

    const linhas = amostra.dados ?? [];
    const colunas: ColunaRemota[] = linhas.length
      ? Object.keys(linhas[0]).map((nome) => {
          const valores = linhas.map((linha) => linha[nome]);
          const primeiroPreenchido = valores.find((valor) => valor !== null && valor !== undefined && valor !== "");
          return {
            nome,
            tipo: inferirTipo(primeiroPreenchido),
            exemplo: normalizarTexto(primeiroPreenchido).slice(0, 60),
            vazios: valores.filter((valor) => valor === null || valor === undefined || valor === "").length,
          };
        })
      : [];

    base.tabelas.push({
      nome: tabela.nome,
      descricao: tabela.descricao,
      linhas: total.total ?? (amostra.ok ? linhas.length : null),
      permissoes,
      colunas,
      erro: amostra.ok ? null : amostra.erro,
    });

    if (tabela.nome === "contadores" && amostra.ok) {
      base.contadores = linhas
        .map((linha) => {
          const chave = normalizarTexto(linha.chave);
          const interpretado = interpretarChaveContador(chave);
          return {
            chave,
            valor: Number(linha.valor ?? 0),
            movimentacao: interpretado.movimentacao,
            tipo: interpretado.tipo,
            ano: interpretado.ano,
            atualizadoEm: normalizarTexto(linha.updated_at) || null,
          };
        })
        .sort((a, b) => a.chave.localeCompare(b.chave));
    }
  }

  const remotos = await buscarTodasLinhas<LinhaRemota>("documentos", "created_at.asc").catch(() => []);
  base.documentos.total = remotos.length;

  const mapas = new Map<string, { chave: string; tipo: TipoDocumento | null; total: number }>();
  const mapasMov = new Map<string, { chave: string; movimentacao: Movimentacao | null; total: number }>();
  const mapaAno = new Map<number, number>();
  const datas: string[] = [];
  const invalidas: AnaliseBaseOficial["documentos"]["datasInvalidas"] = [];

  for (const linha of remotos) {
    const tipo = tipoDoLegado(normalizarTexto(linha.tipo));
    const movimentacao = movimentacaoDoLegado(normalizarTexto(linha.tipo_movimentacao));
    const tipoBruto = normalizarTexto(linha.tipo) || "—";
    const movBruto = normalizarTexto(linha.tipo_movimentacao) || "—";

    const atualTipo = mapas.get(tipoBruto) ?? { chave: tipoBruto, tipo, total: 0 };
    atualTipo.total += 1;
    mapas.set(tipoBruto, atualTipo);

    const atualMov = mapasMov.get(movBruto) ?? { chave: movBruto, movimentacao, total: 0 };
    atualMov.total += 1;
    mapasMov.set(movBruto, atualMov);

    mapaAno.set(Number(linha.ano), (mapaAno.get(Number(linha.ano)) ?? 0) + 1);

    const { iso, anotacao } = separarDataLegada(normalizarTexto(linha.data));
    if (iso) datas.push(iso);
    if (!iso || anotacao) {
      invalidas.push({ id: linha.id, data: normalizarTexto(linha.data), sugestao: iso });
    }
  }

  datas.sort();
  base.documentos.porTipo = [...mapas.values()].sort((a, b) => b.total - a.total);
  base.documentos.porMovimentacao = [...mapasMov.values()].sort((a, b) => b.total - a.total);
  base.documentos.porAno = [...mapaAno.entries()].map(([ano, total]) => ({ ano, total })).sort((a, b) => b.ano - a.ano);
  base.documentos.competencia = { de: datas[0] ?? null, ate: datas[datas.length - 1] ?? null };
  base.documentos.datasInvalidas = invalidas.slice(0, 20);
  base.importacao.pendentes = Math.max(0, base.documentos.total - base.importacao.jaImportados);

  return base;
}

/* ------------------------------------------------------------------ */
/* Importação                                                         */
/* ------------------------------------------------------------------ */

export type RelatorioImportacao = {
  analisados: number;
  importados: number;
  atualizados: number;
  ignorados: number;
  contadoresSincronizados: number;
  erros: string[];
  duracaoMs: number;
};

function mensagemDeErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

export async function importarBaseOficial(): Promise<RelatorioImportacao> {
  const inicio = Date.now();
  const relatorio: RelatorioImportacao = {
    analisados: 0,
    importados: 0,
    atualizados: 0,
    ignorados: 0,
    contadoresSincronizados: 0,
    erros: [],
    duracaoMs: 0,
  };

  if (!supabaseConfigurada()) {
    relatorio.erros.push("Integração não configurada (SUPABASE_URL / SUPABASE_ANON_KEY).");
    return relatorio;
  }

  const remotos = await buscarTodasLinhas<LinhaRemota>("documentos", "created_at.asc");
  relatorio.analisados = remotos.length;

  const existentes = await db
    .select({ id: documentos.id, origemExternaId: documentos.origemExternaId })
    .from(documentos)
    .where(eq(documentos.origemExterna, "SUPABASE"));
  const mapaExistentes = new Map(existentes.map((linha) => [String(linha.origemExternaId), linha.id]));

  const grupos = new Map<string, number>();

  for (const linha of remotos) {
    const tipo = tipoDoLegado(normalizarTexto(linha.tipo));
    const movimentacao = movimentacaoDoLegado(normalizarTexto(linha.tipo_movimentacao));
    if (!tipo || !movimentacao) {
      relatorio.ignorados += 1;
      relatorio.erros.push(`Registro ${linha.id}: espécie/movimentação não reconhecida (${linha.tipo} / ${linha.tipo_movimentacao}).`);
      continue;
    }

    const { iso, anotacao } = separarDataLegada(normalizarTexto(linha.data));
    if (!iso) {
      relatorio.ignorados += 1;
      relatorio.erros.push(`Registro ${linha.id}: data ilegível "${linha.data}".`);
      continue;
    }

    const ano = Number(linha.ano) || Number(iso.slice(0, 4));
    const numeroSequencial = Number(linha.numero) || 0;
    const numeroLegado = `${numeroSequencial}/${ano}`;
    const prefixo = prefixoPadrao(movimentacao, tipo);
    const numero = montarNumero(prefixo, numeroSequencial, 5, ano);
    const interessado = normalizarTexto(linha.interessado);
    const observacoes = [normalizarTexto(linha.observacoes), anotacao ? `BASE OFICIAL: ${anotacao}` : ""]
      .filter(Boolean)
      .join("\n\n");

    const valores = {
      movimentacao,
      tipo,
      numero,
      numeroSequencial,
      numeroLegado,
      ano,
      dataDocumento: iso,
      dataExpedicao: movimentacao === "EXPEDICAO" ? iso : null,
      assunto: normalizarTexto(linha.assunto).slice(0, 240) || `Registro ${numeroLegado}`,
      interessado: interessado || linha.assunto?.slice(0, 180) || null,
      numeroProcesso: normalizarTexto(linha.numero_processo) || null,
      destinatarioNome: null,
      responsavel: "Sincronização da base oficial",
      meioEnvio: "OUTRO" as const,
      grauSigilo: "OSTENSIVO" as const,
      status: (movimentacao === "EXPEDICAO" ? "EXPEDIDO" : "RECEBIDO") as "EXPEDIDO" | "RECEBIDO",
      observacoes: observacoes || null,
      referenciaExterna: `Base oficial • ${linha.id}`,
      origemExterna: "SUPABASE",
      origemExternaId: linha.id,
      sincronizadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    try {
      const idLocal = mapaExistentes.get(linha.id);
      if (idLocal) {
        await db.update(documentos).set(valores).where(eq(documentos.id, idLocal));
        relatorio.atualizados += 1;
      } else {
        const [criado] = await db
          .insert(documentos)
          .values({ ...valores, criadoPor: "Sincronização da base oficial" })
          .returning({ id: documentos.id });
        mapaExistentes.set(linha.id, criado.id);
        relatorio.importados += 1;
      }
      const chave = `${movimentacao}:${tipo}:${ano}`;
      grupos.set(chave, Math.max(grupos.get(chave) ?? 0, numeroSequencial));
    } catch (erro) {
      relatorio.ignorados += 1;
      relatorio.erros.push(`Registro ${linha.id}: ${mensagemDeErro(erro)}`);
    }
  }

  /* Contadores oficiais (tabela contadores) → numeração do sistema */
  try {
    const contadores = await consultar<{ chave: string; valor: number }[]>("contadores", { select: "*" });
    for (const contador of contadores.dados ?? []) {
      const { movimentacao, tipo, ano } = interpretarChaveContador(normalizarTexto(contador.chave));
      if (!movimentacao || !tipo || !ano) continue;
      const valor = Number(contador.valor) || 0;
      await db
        .insert(numeracao)
        .values({
          movimentacao,
          tipo,
          ano,
          prefixo: prefixoPadrao(movimentacao, tipo),
          digitos: 5,
          ultimoNumero: valor,
          chaveLegada: contador.chave,
        })
        .onConflictDoUpdate({
          target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano],
          set: {
            ultimoNumero: sql`greatest(${numeracao.ultimoNumero}, ${valor})`,
            chaveLegada: contador.chave,
            atualizadoEm: new Date(),
          },
        });
      relatorio.contadoresSincronizados += 1;
      grupos.set(`${movimentacao}:${tipo}:${ano}`, Math.max(grupos.get(`${movimentacao}:${tipo}:${ano}`) ?? 0, valor));
    }
  } catch (erro) {
    relatorio.erros.push(`Contadores: ${mensagemDeErro(erro)}`);
  }

  /* Garante que a próxima numeração seja maior que qualquer documento importado */
  for (const [chave, ultimo] of grupos) {
    const [movimentacao, tipo, ano] = chave.split(":") as [Movimentacao, TipoDocumento, string];
    await db
      .insert(numeracao)
      .values({
        movimentacao,
        tipo,
        ano: Number(ano),
        prefixo: prefixoPadrao(movimentacao, tipo),
        digitos: 5,
        ultimoNumero: ultimo,
      })
      .onConflictDoUpdate({
        target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano],
        set: { ultimoNumero: sql`greatest(${numeracao.ultimoNumero}, ${ultimo})`, atualizadoEm: new Date() },
      });
  }

  relatorio.duracaoMs = Date.now() - inicio;

  await db.insert(sincronizacoes).values({
    origem: "SUPABASE",
    tabelas: tabelasAlvo().map((tabela) => tabela.nome).join(", "),
    analisados: relatorio.analisados,
    importados: relatorio.importados,
    atualizados: relatorio.atualizados,
    ignorados: relatorio.ignorados,
    mensagem: relatorio.erros.slice(0, 5).join(" | ") || "Sincronização concluída sem ocorrências.",
  });

  return relatorio;
}

export async function ultimasSincronizacoes(limite = 5) {
  return db
    .select()
    .from(sincronizacoes)
    .orderBy(desc(sincronizacoes.criadoEm))
    .limit(limite);
}

export function descricaoMovimentacao(movimentacao: Movimentacao | null, bruto: string): string {
  if (movimentacao) return CONFIG_MOVIMENTACAO[movimentacao].label;
  return bruto || "—";
}

export function descricaoTipo(tipo: TipoDocumento | null, bruto: string): string {
  if (tipo) return CONFIG_TIPO[tipo].label;
  return bruto || "—";
}
