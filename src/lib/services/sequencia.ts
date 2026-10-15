import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { documentos, numeracao } from "@/db/schema";
import {
  CONFIG_TIPO,
  MOVIMENTACOES,
  TIPOS_DOCUMENTO,
  prefixoPadrao,
  type Movimentacao,
  type TipoDocumento,
} from "@/lib/domain";
import { montarNumero } from "@/lib/format";
import { prepararNumeracao } from "@/lib/services/documentos";

export type LinhaSequencia = {
  movimentacao: Movimentacao;
  tipo: TipoDocumento;
  ano: number;
  prefixo: string;
  digitos: number;
  /** Último número considerado emitido (o próximo será este + 1). */
  ultimoNumero: number;
  /** Próximo número já formatado, ex.: OF-00080/2026 */
  proximoNumero: string;
  /** Maior sequencial existente no acervo para este grupo. */
  ultimoNoAcervo: number;
  /** Quantidade de documentos já lançados neste grupo. */
  documentos: number;
  /** O próximo número já está ocupado no acervo. */
  proximoJaUsado: boolean;
  chaveLegada: string | null;
};

export type AjusteSequencia = {
  ok: boolean;
  linha: LinhaSequencia;
  aviso: string | null;
  numeroAjustado: string;
};

async function montarLinha(
  movimentacao: Movimentacao,
  tipo: TipoDocumento,
  ano: number,
  registro: { prefixo: string; digitos: number; ultimoNumero: number; chaveLegada: string | null } | undefined,
  dadosAcervo: Map<string, { maximo: number; total: number }>,
): Promise<LinhaSequencia> {
  const prefixo = registro?.prefixo ?? prefixoPadrao(movimentacao, tipo);
  const digitos = registro?.digitos ?? 5;
  const ultimoNumero = registro?.ultimoNumero ?? 0;
  const acervo = dadosAcervo.get(`${movimentacao}:${tipo}`) ?? { maximo: 0, total: 0 };
  const proximo = ultimoNumero + 1;

  return {
    movimentacao,
    tipo,
    ano,
    prefixo,
    digitos,
    ultimoNumero,
    proximoNumero: montarNumero(prefixo, proximo, digitos, ano),
    ultimoNoAcervo: acervo.maximo,
    documentos: acervo.total,
    proximoJaUsado: acervo.maximo >= proximo && acervo.total > 0,
    chaveLegada: registro?.chaveLegada ?? null,
  };
}

/** Painel completo das 12 sequências (expedição/recebimento × espécies) do exercício. */
export async function painelSequencia(ano: number): Promise<LinhaSequencia[]> {
  await prepararNumeracao(ano);

  const [registros, agrupado] = await Promise.all([
    db.select().from(numeracao).where(eq(numeracao.ano, ano)),
    db
      .select({
        movimentacao: documentos.movimentacao,
        tipo: documentos.tipo,
        maximo: sql<number>`coalesce(max(${documentos.numeroSequencial}), 0)`,
        total: count(),
      })
      .from(documentos)
      .where(eq(documentos.ano, ano))
      .groupBy(documentos.movimentacao, documentos.tipo),
  ]);

  const mapaRegistros = new Map(registros.map((linha) => [`${linha.movimentacao}:${linha.tipo}`, linha]));
  const mapaAcervo = new Map(
    agrupado.map((linha) => [`${linha.movimentacao}:${linha.tipo}`, { maximo: Number(linha.maximo), total: Number(linha.total) }]),
  );

  const resultado: LinhaSequencia[] = [];
  for (const movimentacao of MOVIMENTACOES) {
    for (const tipo of TIPOS_DOCUMENTO) {
      resultado.push(await montarLinha(movimentacao, tipo, ano, mapaRegistros.get(`${movimentacao}:${tipo}`), mapaAcervo));
    }
  }
  return resultado;
}

/**
 * Define o PRÓXIMO número a emitir em um grupo.
 * Ex.: informar 80 grava 79 como último emitido → o próximo documento sai OF-00080/2026.
 */
export async function ajustarProximo(
  movimentacao: Movimentacao,
  tipo: TipoDocumento,
  ano: number,
  proximo: number,
  confirmarDuplicidade = false,
): Promise<AjusteSequencia> {
  await prepararNumeracao(ano);

  const [existente] = await db
    .select()
    .from(numeracao)
    .where(and(eq(numeracao.movimentacao, movimentacao), eq(numeracao.tipo, tipo), eq(numeracao.ano, ano)))
    .limit(1);

  const prefixo = existente?.prefixo ?? prefixoPadrao(movimentacao, tipo);
  const digitos = existente?.digitos ?? 5;
  const ultimoDesejado = proximo - 1;

  const [conflito] = await db
    .select({ total: count() })
    .from(documentos)
    .where(
      and(
        eq(documentos.movimentacao, movimentacao),
        eq(documentos.tipo, tipo),
        eq(documentos.ano, ano),
        eq(documentos.numeroSequencial, proximo),
      ),
    );
  const jaExiste = Number(conflito?.total ?? 0) > 0;

  if (jaExiste && !confirmarDuplicidade) {
    const acervo = await db
      .select({
        maximo: sql<number>`coalesce(max(${documentos.numeroSequencial}), 0)`,
        total: count(),
      })
      .from(documentos)
      .where(and(eq(documentos.movimentacao, movimentacao), eq(documentos.tipo, tipo), eq(documentos.ano, ano)));

    const linha = await montarLinha(movimentacao, tipo, ano, existente, new Map());
    return {
      ok: false,
      linha: { ...linha, ultimoNoAcervo: Number(acervo[0]?.maximo ?? 0), documentos: Number(acervo[0]?.total ?? 0) },
      numeroAjustado: montarNumero(prefixo, proximo, digitos, ano),
      aviso: `O número ${montarNumero(prefixo, proximo, digitos, ano)} já existe no acervo. Escolha outro ou confirme para continuar mesmo assim.`,
    };
  }

  await db
    .insert(numeracao)
    .values({
      movimentacao,
      tipo,
      ano,
      prefixo,
      digitos,
      ultimoNumero: ultimoDesejado,
    })
    .onConflictDoUpdate({
      target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano],
      set: { ultimoNumero: ultimoDesejado, atualizadoEm: new Date() },
    });

  const linhas = await painelSequencia(ano);
  const linha = linhas.find((item) => item.movimentacao === movimentacao && item.tipo === tipo) as LinhaSequencia;

  return {
    ok: true,
    linha,
    numeroAjustado: montarNumero(prefixo, proximo, digitos, ano),
    aviso: jaExiste
      ? "Sequência ajustada, mas atenção: o número informado já consta no acervo (duplicidade confirmada)."
      : null,
  };
}

/** Recalcula o último número a partir do maior sequencial já lançado no acervo. */
export async function recalcularDoAcervo(
  ano: number,
  movimentacao?: Movimentacao,
  tipo?: TipoDocumento,
): Promise<{ ano: number; ajustadas: number; detalhes: { chave: string; ultimo: number }[] }> {
  await prepararNumeracao(ano);

  const filtros = [eq(documentos.ano, ano)];
  if (movimentacao) filtros.push(eq(documentos.movimentacao, movimentacao));
  if (tipo) filtros.push(eq(documentos.tipo, tipo));

  const agrupado = await db
    .select({
      movimentacao: documentos.movimentacao,
      tipo: documentos.tipo,
      maximo: sql<number>`coalesce(max(${documentos.numeroSequencial}), 0)`,
    })
    .from(documentos)
    .where(and(...filtros))
    .groupBy(documentos.movimentacao, documentos.tipo)
    .orderBy(asc(documentos.movimentacao), asc(documentos.tipo));

  const detalhes: { chave: string; ultimo: number }[] = [];
  for (const linha of agrupado) {
    const maximo = Number(linha.maximo);
    await db
      .update(numeracao)
      .set({ ultimoNumero: maximo, atualizadoEm: new Date() })
      .where(
        and(
          eq(numeracao.movimentacao, linha.movimentacao),
          eq(numeracao.tipo, linha.tipo),
          eq(numeracao.ano, ano),
        ),
      );
    detalhes.push({
      chave: `${linha.movimentacao} · ${CONFIG_TIPO[linha.tipo].label}`,
      ultimo: maximo,
    });
  }

  return { ano, ajustadas: detalhes.length, detalhes };
}
