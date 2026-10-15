import { count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  configuracoes,
  documentoItens,
  documentoMovimentos,
  documentos,
  numeracao,
  setores,
  sincronizacoes,
} from "@/db/schema";
import { MOVIMENTACOES, TIPOS_DOCUMENTO, prefixoPadrao, type Movimentacao, type TipoDocumento } from "@/lib/domain";
import { hojeISO } from "@/lib/format";
import { interpretarChaveContador } from "@/lib/services/importacao";
import { consultar, supabaseConfigurada } from "@/lib/supabase";

export type EscopoLimpeza = "demonstracao" | "total";

export type PreviaManutencao = {
  documentosLocais: number;
  documentosBaseOficial: number;
  setores: number;
  setoresVinculados: number;
  itens: number;
  movimentos: number;
  sincronizacoes: number;
  linhasNumeracao: number;
  contadoresOficiais: number;
  baseOficialConfigurada: boolean;
};

export type RelatorioLimpeza = {
  escopo: EscopoLimpeza;
  documentosRemovidos: number;
  itensRemovidos: number;
  movimentosRemovidos: number;
  setoresRemovidos: number;
  sincronizacoesRemovidas: number;
  numeracaoAjustada: number;
  contatosInstitucionaisLimpos: boolean;
  duracaoMs: number;
};

export async function previaLimpeza(): Promise<PreviaManutencao> {
  const [
    locais,
    oficiais,
    setoresTotal,
    setoresVinculados,
    itens,
    movimentos,
    sincs,
    numeracaoTotal,
  ] = await Promise.all([
    db.select({ total: count() }).from(documentos).where(isNull(documentos.origemExterna)),
    db.select({ total: count() }).from(documentos).where(eq(documentos.origemExterna, "SUPABASE")),
    db.select({ total: count() }).from(setores),
    db
      .select({ total: count() })
      .from(setores)
      .where(
        sql`exists (select 1 from documentos d where d.setor_origem_id = ${setores.id} or d.setor_destino_id = ${setores.id})`,
      ),
    db.select({ total: count() }).from(documentoItens),
    db.select({ total: count() }).from(documentoMovimentos),
    db.select({ total: count() }).from(sincronizacoes),
    db.select({ total: count() }).from(numeracao),
  ]);

  return {
    documentosLocais: Number(locais[0]?.total ?? 0),
    documentosBaseOficial: Number(oficiais[0]?.total ?? 0),
    setores: Number(setoresTotal[0]?.total ?? 0),
    setoresVinculados: Number(setoresVinculados[0]?.total ?? 0),
    itens: Number(itens[0]?.total ?? 0),
    movimentos: Number(movimentos[0]?.total ?? 0),
    sincronizacoes: Number(sincs[0]?.total ?? 0),
    linhasNumeracao: Number(numeracaoTotal[0]?.total ?? 0),
    contadoresOficiais: (await contadoresOficiais()).size,
    baseOficialConfigurada: supabaseConfigurada(),
  };
}

/** Lê os contadores da base oficial (EXPEDIÇÃO_OFÍCIO_2026 → 79, etc.). */
async function contadoresOficiais(): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (!supabaseConfigurada()) return mapa;
  try {
    const resposta = await consultar<{ chave: string; valor: number }[]>("contadores", { select: "*" });
    for (const contador of resposta.dados ?? []) {
      const chave = String(contador.chave ?? "");
      const interpretado = interpretarChaveContador(chave);
      if (!interpretado.movimentacao || !interpretado.tipo || !interpretado.ano) continue;
      mapa.set(
        `${interpretado.movimentacao}:${interpretado.tipo}:${interpretado.ano}`,
        Number(contador.valor) || 0,
      );
    }
  } catch {
    /* base oficial indisponível: mantém somente o maior sequencial local */
  }
  return mapa;
}

/**
 * Reconstrói a numeração a partir do maior sequencial existente e, quando o
 * escopo é "demonstracao", respeita os contadores da base oficial como piso.
 */
async function recalcularNumeracao(escopo: EscopoLimpeza): Promise<number> {
  const piso = escopo === "total" ? new Map<string, number>() : await contadoresOficiais();

  const maximos = await db
    .select({
      movimentacao: documentos.movimentacao,
      tipo: documentos.tipo,
      ano: documentos.ano,
      maximo: sql<number>`coalesce(max(${documentos.numeroSequencial}), 0)`,
    })
    .from(documentos)
    .groupBy(documentos.movimentacao, documentos.tipo, documentos.ano);
  const porGrupo = new Map(maximos.map((linha) => [`${linha.movimentacao}:${linha.tipo}:${linha.ano}`, Number(linha.maximo)]));

  const anoAtual = Number(hojeISO().slice(0, 4));
  const anos = new Set<number>([anoAtual]);
  const existentes = await db.select().from(numeracao);
  existentes.forEach((linha) => anos.add(linha.ano));

  /* Garante uma linha para cada movimentação + espécie + exercício. */
  for (const ano of anos) {
    for (const movimentacao of MOVIMENTACOES) {
      for (const tipo of TIPOS_DOCUMENTO) {
        await db
          .insert(numeracao)
          .values({
            movimentacao,
            tipo,
            ano,
            prefixo: prefixoPadrao(movimentacao, tipo),
            digitos: 5,
            ultimoNumero: 0,
          })
          .onConflictDoNothing({ target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano] });
      }
    }
  }

  const linhas = await db.select().from(numeracao);
  let ajustadas = 0;
  for (const linha of linhas) {
    const chave = `${linha.movimentacao}:${linha.tipo}:${linha.ano}`;
    const valor = Math.max(
      escopo === "total" ? 0 : piso.get(chave) ?? 0,
      porGrupo.get(chave) ?? 0,
    );
    if (valor !== linha.ultimoNumero || (escopo === "total" && linha.chaveLegada)) {
      await db
        .update(numeracao)
        .set({
          ultimoNumero: valor,
          chaveLegada: escopo === "total" ? null : linha.chaveLegada,
          atualizadoEm: new Date(),
        })
        .where(eq(numeracao.id, linha.id));
      ajustadas += 1;
    }
  }
  return ajustadas;
}

export async function limparBase(escopo: EscopoLimpeza): Promise<RelatorioLimpeza> {
  const inicio = Date.now();
  const relatorio: RelatorioLimpeza = {
    escopo,
    documentosRemovidos: 0,
    itensRemovidos: 0,
    movimentosRemovidos: 0,
    setoresRemovidos: 0,
    sincronizacoesRemovidas: 0,
    numeracaoAjustada: 0,
    contatosInstitucionaisLimpos: false,
    duracaoMs: 0,
  };

  const [itens, movimentos] = await Promise.all([
    db.select({ total: count() }).from(documentoItens),
    db.select({ total: count() }).from(documentoMovimentos),
  ]);
  relatorio.itensRemovidos = Number(itens[0]?.total ?? 0);
  relatorio.movimentosRemovidos = Number(movimentos[0]?.total ?? 0);

  relatorio.documentosRemovidos =
    escopo === "total"
      ? (await db.delete(documentos).returning({ id: documentos.id })).length
      : (await db.delete(documentos).where(isNull(documentos.origemExterna)).returning({ id: documentos.id })).length;

  relatorio.setoresRemovidos =
    escopo === "total"
      ? (await db.delete(setores).returning({ id: setores.id })).length
      : (
          await db
            .delete(setores)
            .where(
              sql`not exists (select 1 from documentos d where d.setor_origem_id = ${setores.id} or d.setor_destino_id = ${setores.id})`,
            )
            .returning({ id: setores.id })
        ).length;

  relatorio.sincronizacoesRemovidas = (await db.delete(sincronizacoes).returning({ id: sincronizacoes.id })).length;

  if (escopo === "demonstracao") {
    /* Remove dados de contato fictícios; mantém a identificação da unidade escolar. */
    await db
      .update(configuracoes)
      .set({
        orgaoUnidade: "",
        endereco: "",
        cidade: "",
        uf: "",
        cep: "",
        telefone: "",
        email: "",
        site: "",
        responsavelPadrao: "",
        cargoPadrao: "",
        atualizadoEm: new Date(),
      })
      .where(eq(configuracoes.id, 1));
    relatorio.contatosInstitucionaisLimpos = true;
  }

  relatorio.numeracaoAjustada = await recalcularNumeracao(escopo);
  relatorio.duracaoMs = Date.now() - inicio;
  return relatorio;
}
