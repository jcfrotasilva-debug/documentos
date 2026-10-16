import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  configuracoes,
  documentoItens,
  documentoMovimentos,
  documentos,
  numeracao,
  setores,
  type Documento,
} from "@/db/schema";
import {
  CONFIG_TIPO,
  MOVIMENTACOES,
  TIPOS_DOCUMENTO,
  prefixoPadrao,
  type GrauSigilo,
  type MeioEnvio,
  type Movimentacao,
  type Prioridade,
  type StatusDocumento,
  type TipoDocumento,
} from "@/lib/domain";
import { gerarCSV, hojeISO, montarNumero } from "@/lib/format";
import type { DocumentoInput } from "@/lib/validation";

const origem = alias(setores, "origem");
const destino = alias(setores, "destino");

export type DocumentoListado = Documento & {
  origemSigla: string | null;
  origemNome: string | null;
  destinoSigla: string | null;
  destinoNome: string | null;
};

export type FiltrosDocumento = {
  q?: string;
  movimentacao?: Movimentacao | "TODOS";
  tipo?: TipoDocumento | "TODOS";
  status?: StatusDocumento | "TODOS";
  prioridade?: Prioridade | "TODOS";
  ano?: number | "TODOS";
  setorId?: number | "TODOS";
  de?: string;
  ate?: string;
  page?: number;
  pageSize?: number;
  ordenar?: "recentes" | "antigos" | "numero" | "assunto";
};

const colunasLista = {
  id: documentos.id,
  movimentacao: documentos.movimentacao,
  tipo: documentos.tipo,
  numero: documentos.numero,
  numeroSequencial: documentos.numeroSequencial,
  numeroLegado: documentos.numeroLegado,
  ano: documentos.ano,
  dataDocumento: documentos.dataDocumento,
  dataExpedicao: documentos.dataExpedicao,
  prazoResposta: documentos.prazoResposta,
  assunto: documentos.assunto,
  conteudo: documentos.conteudo,
  interessado: documentos.interessado,
  numeroProcesso: documentos.numeroProcesso,
  destinatarioNome: documentos.destinatarioNome,
  destinatarioCargo: documentos.destinatarioCargo,
  setorOrigemId: documentos.setorOrigemId,
  setorDestinoId: documentos.setorDestinoId,
  responsavel: documentos.responsavel,
  cargoResponsavel: documentos.cargoResponsavel,
  meioEnvio: documentos.meioEnvio,
  prioridade: documentos.prioridade,
  grauSigilo: documentos.grauSigilo,
  status: documentos.status,
  referenciaExterna: documentos.referenciaExterna,
  qtdPaginas: documentos.qtdPaginas,
  qtdAnexos: documentos.qtdAnexos,
  observacoes: documentos.observacoes,
  criadoPor: documentos.criadoPor,
  origemExterna: documentos.origemExterna,
  origemExternaId: documentos.origemExternaId,
  sincronizadoEm: documentos.sincronizadoEm,
  criadoEm: documentos.criadoEm,
  atualizadoEm: documentos.atualizadoEm,
  origemSigla: origem.sigla,
  origemNome: origem.nome,
  destinoSigla: destino.sigla,
  destinoNome: destino.nome,
};

function construirFiltro(filtros: FiltrosDocumento) {
  const partes = [];
  if (filtros.movimentacao && filtros.movimentacao !== "TODOS")
    partes.push(eq(documentos.movimentacao, filtros.movimentacao));
  if (filtros.tipo && filtros.tipo !== "TODOS") partes.push(eq(documentos.tipo, filtros.tipo));
  if (filtros.status && filtros.status !== "TODOS") partes.push(eq(documentos.status, filtros.status));
  if (filtros.prioridade && filtros.prioridade !== "TODOS")
    partes.push(eq(documentos.prioridade, filtros.prioridade));
  if (filtros.ano && filtros.ano !== "TODOS") partes.push(eq(documentos.ano, Number(filtros.ano)));
  if (filtros.setorId && filtros.setorId !== "TODOS") {
    const id = Number(filtros.setorId);
    partes.push(or(eq(documentos.setorOrigemId, id), eq(documentos.setorDestinoId, id)));
  }
  if (filtros.de) partes.push(gte(documentos.dataDocumento, filtros.de));
  if (filtros.ate) partes.push(lte(documentos.dataDocumento, filtros.ate));

  const termo = filtros.q?.trim();
  if (termo) {
    const busca = `%${termo}%`;
    partes.push(
      or(
        ilike(documentos.numero, busca),
        ilike(documentos.numeroLegado, busca),
        ilike(documentos.assunto, busca),
        ilike(documentos.interessado, busca),
        ilike(documentos.numeroProcesso, busca),
        ilike(documentos.destinatarioNome, busca),
        ilike(documentos.responsavel, busca),
        ilike(documentos.referenciaExterna, busca),
        ilike(documentos.conteudo, busca),
      ),
    );
  }
  return partes.length ? and(...partes) : undefined;
}

function ordenacao(ordenar: FiltrosDocumento["ordenar"]) {
  switch (ordenar) {
    case "antigos":
      return [asc(documentos.dataDocumento), asc(documentos.numeroSequencial)];
    case "numero":
      return [desc(documentos.ano), asc(documentos.tipo), desc(documentos.numeroSequencial)];
    case "assunto":
      return [asc(documentos.assunto)];
    default:
      return [desc(documentos.dataDocumento), desc(documentos.numeroSequencial)];
  }
}

function baseQuery() {
  return db
    .select(colunasLista)
    .from(documentos)
    .leftJoin(origem, eq(documentos.setorOrigemId, origem.id))
    .leftJoin(destino, eq(documentos.setorDestinoId, destino.id));
}

export async function listarDocumentos(filtros: FiltrosDocumento) {
  const page = Math.max(1, Number(filtros.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(filtros.pageSize ?? 15) || 15));
  const where = construirFiltro(filtros);

  const [linhas, totalResultado] = await Promise.all([
    baseQuery()
      .where(where)
      .orderBy(...ordenacao(filtros.ordenar))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(documentos).where(where),
  ]);

  const total = Number(totalResultado[0]?.total ?? 0);
  return {
    linhas: linhas as DocumentoListado[],
    total,
    page,
    pageSize,
    paginas: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listarTodosParaExportacao(filtros: FiltrosDocumento) {
  const where = construirFiltro(filtros);
  const linhas = await baseQuery().where(where).orderBy(...ordenacao(filtros.ordenar)).limit(10000);
  return linhas as DocumentoListado[];
}

export function montarCSVDocumentos(linhas: DocumentoListado[]): string {
  const cabecalho = [
    "Número",
    "Número original",
    "Movimentação",
    "Tipo",
    "Data",
    "Assunto",
    "Interessado",
    "Responsável",
    "Meio de envio",
    "Prioridade",
    "Grau de sigilo",
    "Situação",
    "Páginas",
    "Anexos",
    "Prazo de resposta",
    "Nº do processo",
    "Referência externa",
    "Registro original",
  ];
  const dados = linhas.map((linha) => [
    linha.numero,
    linha.numeroLegado ?? "",
    linha.movimentacao === "RECEBIMENTO" ? "Recebimento" : "Expedição",
    CONFIG_TIPO[linha.tipo].label,
    linha.dataDocumento,
    linha.assunto,
    linha.interessado ?? linha.destinatarioNome ?? "",
    linha.responsavel,
    linha.meioEnvio,
    linha.prioridade,
    linha.grauSigilo,
    linha.status,
    linha.qtdPaginas,
    linha.qtdAnexos,
    linha.prazoResposta ?? "",
    linha.numeroProcesso ?? "",
    linha.referenciaExterna ?? "",
    linha.origemExterna
      ? `${linha.origemExterna}:${linha.origemExternaId ?? ""}`
      : "",
  ]);
  return gerarCSV(cabecalho, dados);
}

export async function buscarDocumento(id: number) {
  const [documento] = await baseQuery().where(eq(documentos.id, id)).limit(1);
  if (!documento) return null;
  const [itens, movimentos] = await Promise.all([
    db.select().from(documentoItens).where(eq(documentoItens.documentoId, id)).orderBy(asc(documentoItens.ordem)),
    db
      .select()
      .from(documentoMovimentos)
      .where(eq(documentoMovimentos.documentoId, id))
      .orderBy(desc(documentoMovimentos.criadoEm)),
  ]);
  return { documento: documento as DocumentoListado, itens, movimentos };
}

/* ------------------------------------------------------------------ */
/* Numeração automática — chave: movimentação + tipo + ano            */
/* ------------------------------------------------------------------ */

const COMBINACOES = MOVIMENTACOES.flatMap((movimentacao) =>
  TIPOS_DOCUMENTO.map((tipo) => ({ movimentacao, tipo })),
);

async function garantirNumeracao(movimentacao: Movimentacao, tipo: TipoDocumento, ano: number) {
  await db
    .insert(numeracao)
    .values({ movimentacao, tipo, ano, prefixo: prefixoPadrao(movimentacao, tipo), digitos: 5 })
    .onConflictDoNothing({ target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano] });
}

export async function prepararNumeracao(ano: number) {
  await Promise.all(COMBINACOES.map(({ movimentacao, tipo }) => garantirNumeracao(movimentacao, tipo, ano)));
}

export type PrevisaoNumero = {
  movimentacao: Movimentacao;
  tipo: TipoDocumento;
  prefixo: string;
  digitos: number;
  sequencial: number;
  ultimoNumero: number;
  numero: string;
};

export async function espiarProximosNumeros(ano: number): Promise<PrevisaoNumero[]> {
  await prepararNumeracao(ano);
  const registros = await db.select().from(numeracao).where(eq(numeracao.ano, ano));
  const mapa = new Map(registros.map((r) => [`${r.movimentacao}:${r.tipo}`, r]));
  return COMBINACOES.map(({ movimentacao, tipo }) => {
    const registro = mapa.get(`${movimentacao}:${tipo}`);
    const prefixo = registro?.prefixo ?? prefixoPadrao(movimentacao, tipo);
    const digitos = registro?.digitos ?? 5;
    const ultimoNumero = registro?.ultimoNumero ?? 0;
    return {
      movimentacao,
      tipo,
      prefixo,
      digitos,
      sequencial: ultimoNumero + 1,
      ultimoNumero,
      numero: montarNumero(prefixo, ultimoNumero + 1, digitos, ano),
    };
  });
}

export async function listarNumeracao(ano: number) {
  await prepararNumeracao(ano);
  return db
    .select()
    .from(numeracao)
    .where(eq(numeracao.ano, ano))
    .orderBy(asc(numeracao.movimentacao), asc(numeracao.tipo));
}

export async function numeracaoDoAno(ano: number) {
  return db.select().from(numeracao).where(eq(numeracao.ano, ano));
}

export type DocumentoCriado = { id: number; numero: string; ano: number; movimentacao: Movimentacao };

export async function criarDocumento(input: DocumentoInput, usuario = "Sistema"): Promise<DocumentoCriado> {
  const tipo = input.tipo as TipoDocumento;
  const movimentacao = input.movimentacao as Movimentacao;
  const ano = input.ano ?? Number(input.dataDocumento.slice(0, 4));
  const status = input.status as StatusDocumento;

  return db.transaction(async (tx) => {
    const [registro] = await tx
      .insert(numeracao)
      .values({
        movimentacao,
        tipo,
        ano,
        prefixo: prefixoPadrao(movimentacao, tipo),
        digitos: 5,
        ultimoNumero: 1,
      })
      .onConflictDoUpdate({
        target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano],
        set: { ultimoNumero: sql`${numeracao.ultimoNumero} + 1`, atualizadoEm: new Date() },
      })
      .returning();

    const numero = input.numeroManual?.trim()
      ? input.numeroManual.trim()
      : montarNumero(registro.prefixo, registro.ultimoNumero, registro.digitos, ano);

    const [criado] = await tx
      .insert(documentos)
      .values({
        movimentacao,
        tipo,
        numero,
        numeroSequencial: registro.ultimoNumero,
        numeroLegado: montarNumero("", registro.ultimoNumero, registro.digitos, ano).replace(/^-/, ""),
        ano,
        dataDocumento: input.dataDocumento,
        dataExpedicao: input.dataExpedicao ?? null,
        prazoResposta: input.prazoResposta ?? null,
        assunto: input.assunto,
        conteudo: input.conteudo ?? null,
        interessado: input.interessado ?? null,
        numeroProcesso: input.numeroProcesso ?? null,
        destinatarioNome: input.destinatarioNome ?? input.interessado ?? null,
        destinatarioCargo: input.destinatarioCargo ?? null,
        setorOrigemId: input.setorOrigemId ?? null,
        setorDestinoId: input.setorDestinoId ?? null,
        responsavel: input.responsavel,
        cargoResponsavel: input.cargoResponsavel ?? null,
        meioEnvio: input.meioEnvio as MeioEnvio,
        prioridade: input.prioridade as Prioridade,
        grauSigilo: input.grauSigilo as GrauSigilo,
        status,
        referenciaExterna: input.referenciaExterna ?? null,
        qtdPaginas: input.qtdPaginas,
        qtdAnexos: input.qtdAnexos,
        observacoes: input.observacoes ?? null,
        criadoPor: input.criadoPor?.trim() || usuario,
      })
      .returning();

    if (input.itens.length) {
      await tx.insert(documentoItens).values(
        input.itens.map((item, indice) => ({
          documentoId: criado.id,
          ordem: indice + 1,
          descricao: item.descricao,
          numeroReferencia: item.numeroReferencia,
          quantidade: item.quantidade,
          valor: item.valor,
          observacao: item.observacao,
        })),
      );
    }

    await tx.insert(documentoMovimentos).values({
      documentoId: criado.id,
      status,
      descricao: `${movimentacao === "RECEBIMENTO" ? "Recebimento" : "Expedição"} registrada com numeração automática ${numero}`,
      usuario: input.criadoPor?.trim() || usuario,
    });

    return { id: criado.id, numero: criado.numero, ano: criado.ano, movimentacao };
  });
}

export async function atualizarDocumento(id: number, input: DocumentoInput, usuario = "Sistema") {
  const atual = await db.select().from(documentos).where(eq(documentos.id, id)).limit(1);
  const anterior = atual[0];
  if (!anterior) return null;

  const tipo = input.tipo as TipoDocumento;
  const movimentacao = input.movimentacao as Movimentacao;
  const status = input.status as StatusDocumento;
  const numero = input.numeroManual?.trim() ? input.numeroManual.trim() : anterior.numero;

  return db.transaction(async (tx) => {
    const [atualizado] = await tx
      .update(documentos)
      .set({
        movimentacao,
        tipo,
        numero,
        dataDocumento: input.dataDocumento,
        dataExpedicao: input.dataExpedicao ?? null,
        prazoResposta: input.prazoResposta ?? null,
        assunto: input.assunto,
        conteudo: input.conteudo ?? null,
        interessado: input.interessado ?? null,
        numeroProcesso: input.numeroProcesso ?? null,
        destinatarioNome: input.destinatarioNome ?? input.interessado ?? null,
        destinatarioCargo: input.destinatarioCargo ?? null,
        setorOrigemId: input.setorOrigemId ?? null,
        setorDestinoId: input.setorDestinoId ?? null,
        responsavel: input.responsavel,
        cargoResponsavel: input.cargoResponsavel ?? null,
        meioEnvio: input.meioEnvio as MeioEnvio,
        prioridade: input.prioridade as Prioridade,
        grauSigilo: input.grauSigilo as GrauSigilo,
        status,
        referenciaExterna: input.referenciaExterna ?? null,
        qtdPaginas: input.qtdPaginas,
        qtdAnexos: input.qtdAnexos,
        observacoes: input.observacoes ?? null,
        atualizadoEm: new Date(),
      })
      .where(eq(documentos.id, id))
      .returning();

    await tx.delete(documentoItens).where(eq(documentoItens.documentoId, id));
    if (input.itens.length) {
      await tx.insert(documentoItens).values(
        input.itens.map((item, indice) => ({
          documentoId: id,
          ordem: indice + 1,
          descricao: item.descricao,
          numeroReferencia: item.numeroReferencia,
          quantidade: item.quantidade,
          valor: item.valor,
          observacao: item.observacao,
        })),
      );
    }

    await tx.insert(documentoMovimentos).values({
      documentoId: id,
      status,
      descricao:
        anterior.status !== status
          ? `Documento atualizado — situação alterada para ${status}`
          : "Documento atualizado",
      usuario,
    });

    return atualizado;
  });
}

export async function alterarStatus(
  id: number,
  status: StatusDocumento,
  descricao: string,
  usuario = "Sistema",
) {
  const [atualizado] = await db
    .update(documentos)
    .set({ status, atualizadoEm: new Date() })
    .where(eq(documentos.id, id))
    .returning();
  if (!atualizado) return null;
  await db.insert(documentoMovimentos).values({ documentoId: id, status, descricao, usuario });
  return atualizado;
}

export async function excluirDocumento(id: number) {
  const [removido] = await db.delete(documentos).where(eq(documentos.id, id)).returning();
  return removido ?? null;
}

/* ------------------------------------------------------------------ */
/* Estatísticas do painel                                             */
/* ------------------------------------------------------------------ */

export type EstatisticasDashboard = {
  total: number;
  totalExpedicao: number;
  totalRecebimento: number;
  expedidosMes: number;
  recebidosMes: number;
  pendentesPrazo: number;
  sigilosos: number;
  rascunhos: number;
  porTipo: { tipo: TipoDocumento; total: number }[];
  porTipoMovimentacao: { movimentacao: Movimentacao; tipo: TipoDocumento; total: number }[];
  porStatus: { status: StatusDocumento; total: number }[];
  serieMensal: { mes: string; expedicao: number; recebimento: number }[];
  porInteressado: { chave: string; total: number }[];
  recentes: DocumentoListado[];
  alertas: DocumentoListado[];
};

export async function estatisticasDashboard(): Promise<EstatisticasDashboard> {
  const hoje = hojeISO();
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const inicioSerie = new Date(`${hoje.slice(0, 7)}-01T00:00:00`);
  inicioSerie.setMonth(inicioSerie.getMonth() - 11);
  const desde = inicioSerie.toISOString().slice(0, 10);

  const [
    totalResultado,
    porMovResultado,
    mesResultado,
    pendentesResultado,
    sigilososResultado,
    rascunhosResultado,
    tipoMovResultado,
    statusResultado,
    serieResultado,
    porInteressadoResultado,
    recentes,
    alertas,
  ] = await Promise.all([
    db.select({ total: count() }).from(documentos),
    db.select({ movimentacao: documentos.movimentacao, total: count() }).from(documentos).groupBy(documentos.movimentacao),
    db
      .select({ movimentacao: documentos.movimentacao, total: count() })
      .from(documentos)
      .where(gte(documentos.dataDocumento, inicioMes))
      .groupBy(documentos.movimentacao),
    db
      .select({ total: count() })
      .from(documentos)
      .where(
        and(
          lte(documentos.prazoResposta, hoje),
          inArray(documentos.status, ["EXPEDIDO", "EM_TRANSITO", "RASCUNHO"]),
        ),
      ),
    db.select({ total: count() }).from(documentos).where(eq(documentos.grauSigilo, "SIGILOSO")),
    db.select({ total: count() }).from(documentos).where(eq(documentos.status, "RASCUNHO")),
    db
      .select({ movimentacao: documentos.movimentacao, tipo: documentos.tipo, total: count() })
      .from(documentos)
      .groupBy(documentos.movimentacao, documentos.tipo),
    db.select({ status: documentos.status, total: count() }).from(documentos).groupBy(documentos.status),
    db
      .select({
        mes: sql<string>`to_char(${documentos.dataDocumento}, 'YYYY-MM')`,
        movimentacao: documentos.movimentacao,
        total: count(),
      })
      .from(documentos)
      .where(gte(documentos.dataDocumento, desde))
      .groupBy(sql`to_char(${documentos.dataDocumento}, 'YYYY-MM')`, documentos.movimentacao)
      .orderBy(sql`to_char(${documentos.dataDocumento}, 'YYYY-MM')`),
    db
      .select({ chave: sql<string>`coalesce(nullif(${documentos.interessado}, ''), ${documentos.destinatarioNome}, 'Não informado')`, total: count() })
      .from(documentos)
      .groupBy(sql`coalesce(nullif(${documentos.interessado}, ''), ${documentos.destinatarioNome}, 'Não informado')`)
      .orderBy(desc(count()))
      .limit(6),
    baseQuery().orderBy(desc(documentos.criadoEm)).limit(6),
    baseQuery()
      .where(
        and(
          lte(documentos.prazoResposta, hoje),
          inArray(documentos.status, ["EXPEDIDO", "EM_TRANSITO", "RASCUNHO"]),
        ),
      )
      .orderBy(asc(documentos.prazoResposta))
      .limit(6),
  ]);

  const porTipoMovimentacao = tipoMovResultado.map((linha) => ({
    movimentacao: linha.movimentacao,
    tipo: linha.tipo,
    total: Number(linha.total),
  }));

  const porTipoMapa = new Map<TipoDocumento, number>();
  porTipoMovimentacao.forEach((linha) =>
    porTipoMapa.set(linha.tipo, (porTipoMapa.get(linha.tipo) ?? 0) + linha.total),
  );

  const mapaSerie = new Map<string, { expedicao: number; recebimento: number }>();
  serieResultado.forEach((linha) => {
    const atual = mapaSerie.get(linha.mes) ?? { expedicao: 0, recebimento: 0 };
    if (linha.movimentacao === "RECEBIMENTO") atual.recebimento += Number(linha.total);
    else atual.expedicao += Number(linha.total);
    mapaSerie.set(linha.mes, atual);
  });

  const serieMensal: { mes: string; expedicao: number; recebimento: number }[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const ref = new Date(`${hoje.slice(0, 7)}-01T00:00:00`);
    ref.setMonth(ref.getMonth() - i);
    const chave = ref.toISOString().slice(0, 7);
    serieMensal.push({ mes: chave, ...(mapaSerie.get(chave) ?? { expedicao: 0, recebimento: 0 }) });
  }

  const totalMov = (movimentacao: Movimentacao) =>
    Number(porMovResultado.find((l) => l.movimentacao === movimentacao)?.total ?? 0);
  const totalMes = (movimentacao: Movimentacao) =>
    Number(mesResultado.find((l) => l.movimentacao === movimentacao)?.total ?? 0);

  return {
    total: Number(totalResultado[0]?.total ?? 0),
    totalExpedicao: totalMov("EXPEDICAO"),
    totalRecebimento: totalMov("RECEBIMENTO"),
    expedidosMes: totalMes("EXPEDICAO"),
    recebidosMes: totalMes("RECEBIMENTO"),
    pendentesPrazo: Number(pendentesResultado[0]?.total ?? 0),
    sigilosos: Number(sigilososResultado[0]?.total ?? 0),
    rascunhos: Number(rascunhosResultado[0]?.total ?? 0),
    porTipo: TIPOS_DOCUMENTO.map((tipo) => ({ tipo, total: porTipoMapa.get(tipo) ?? 0 })),
    porTipoMovimentacao,
    porStatus: statusResultado.map((l) => ({ status: l.status, total: Number(l.total) })),
    serieMensal,
    porInteressado: porInteressadoResultado.map((l) => ({
      chave: l.chave ?? "Não informado",
      total: Number(l.total),
    })),
    recentes: recentes as DocumentoListado[],
    alertas: alertas as DocumentoListado[],
  };
}

/* ------------------------------------------------------------------ */
/* Relatório por período                                              */
/* ------------------------------------------------------------------ */

export type RelatorioPeriodo = {
  total: number;
  paginas: number;
  porTipo: { chave: TipoDocumento; total: number }[];
  porMovimentacao: { chave: Movimentacao; total: number }[];
  porStatus: { chave: StatusDocumento; total: number }[];
  porMeio: { chave: MeioEnvio; total: number }[];
  porInteressado: { chave: string; total: number }[];
  porResponsavel: { chave: string; total: number }[];
  porMes: { chave: string; total: number }[];
  porAno: { chave: string; total: number }[];
};

export async function relatorioPeriodo(filtros: FiltrosDocumento): Promise<RelatorioPeriodo> {
  const where = construirFiltro(filtros);
  const [
    totalResultado,
    tipoResultado,
    movResultado,
    statusResultado,
    meioResultado,
    porInteressadoResultado,
    responsavelResultado,
    mesResultado,
    anoResultado,
  ] = await Promise.all([
    db
      .select({ total: count(), paginas: sql<number>`coalesce(sum(${documentos.qtdPaginas}), 0)` })
      .from(documentos)
      .where(where),
    db.select({ chave: documentos.tipo, total: count() }).from(documentos).where(where).groupBy(documentos.tipo).orderBy(desc(count())),
    db
      .select({ chave: documentos.movimentacao, total: count() })
      .from(documentos)
      .where(where)
      .groupBy(documentos.movimentacao)
      .orderBy(desc(count())),
    db.select({ chave: documentos.status, total: count() }).from(documentos).where(where).groupBy(documentos.status).orderBy(desc(count())),
    db.select({ chave: documentos.meioEnvio, total: count() }).from(documentos).where(where).groupBy(documentos.meioEnvio).orderBy(desc(count())),
    db
      .select({ chave: sql<string>`coalesce(nullif(${documentos.interessado}, ''), ${documentos.destinatarioNome}, 'Não informado')`, total: count() })
      .from(documentos)
      .where(where)
      .groupBy(sql`coalesce(nullif(${documentos.interessado}, ''), ${documentos.destinatarioNome}, 'Não informado')`)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ chave: documentos.responsavel, total: count() })
      .from(documentos)
      .where(where)
      .groupBy(documentos.responsavel)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ chave: sql<string>`to_char(${documentos.dataDocumento}, 'YYYY-MM')`, total: count() })
      .from(documentos)
      .where(where)
      .groupBy(sql`to_char(${documentos.dataDocumento}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${documentos.dataDocumento}, 'YYYY-MM')`),
    db
      .select({ chave: sql<string>`${documentos.ano}::text`, total: count() })
      .from(documentos)
      .where(where)
      .groupBy(documentos.ano)
      .orderBy(asc(documentos.ano)),
  ]);

  return {
    total: Number(totalResultado[0]?.total ?? 0),
    paginas: Number(totalResultado[0]?.paginas ?? 0),
    porTipo: tipoResultado.map((linha) => ({ chave: linha.chave, total: Number(linha.total) })),
    porMovimentacao: movResultado.map((linha) => ({ chave: linha.chave, total: Number(linha.total) })),
    porStatus: statusResultado.map((linha) => ({ chave: linha.chave, total: Number(linha.total) })),
    porMeio: meioResultado.map((linha) => ({ chave: linha.chave, total: Number(linha.total) })),
    porInteressado: porInteressadoResultado.map((linha) => ({
      chave: linha.chave ?? "Não informado",
      total: Number(linha.total),
    })),
    porResponsavel: responsavelResultado.map((linha) => ({ chave: linha.chave, total: Number(linha.total) })),
    porMes: mesResultado.map((linha) => ({ chave: linha.chave, total: Number(linha.total) })),
    porAno: anoResultado.map((linha) => ({ chave: linha.chave, total: Number(linha.total) })),
  };
}

/* ------------------------------------------------------------------ */
/* Setores / configurações                                            */
/* ------------------------------------------------------------------ */

export async function setoresComContagem() {
  const [lista, porUnidadeOrigem, porUnidadeDestino] = await Promise.all([
    db.select().from(setores).orderBy(asc(setores.sigla)),
    db
      .select({ setorId: documentos.setorOrigemId, total: count() })
      .from(documentos)
      .groupBy(documentos.setorOrigemId),
    db
      .select({ setorId: documentos.setorDestinoId, total: count() })
      .from(documentos)
      .groupBy(documentos.setorDestinoId),
  ]);

  const contagem = new Map<number, number>();
  [...porUnidadeOrigem, ...porUnidadeDestino].forEach((linha) => {
    if (linha.setorId === null) return;
    contagem.set(Number(linha.setorId), (contagem.get(Number(linha.setorId)) ?? 0) + Number(linha.total));
  });

  return lista.map((setor) => ({ ...setor, documentos: contagem.get(setor.id) ?? 0 }));
}

export async function listarSetores(apenasAtivos = false) {
  const query = db.select().from(setores);
  const linhas = apenasAtivos
    ? await query.where(eq(setores.ativo, true)).orderBy(asc(setores.sigla))
    : await query.orderBy(asc(setores.sigla));
  return linhas;
}

export async function buscarConfiguracao() {
  const [existente] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1)).limit(1);
  if (existente) return existente;
  const [criada] = await db.insert(configuracoes).values({ id: 1 }).returning();
  return criada;
}

export async function salvarConfiguracao(dados: {
  orgaoNome: string;
  orgaoUnidade: string;
  orgaoSigla: string;
  orgaoHierarquia?: string;
  logoUrl?: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  site: string;
  responsavelPadrao: string;
  cargoPadrao: string;
}) {
  const [salva] = await db
    .insert(configuracoes)
    .values({ id: 1, ...dados })
    .onConflictDoUpdate({
      target: configuracoes.id,
      set: { ...dados, atualizadoEm: new Date() },
    })
    .returning();
  return salva;
}

/* ------------------------------------------------------------------ */
/* Brasão / logotipo do timbre                                        */
/* ------------------------------------------------------------------ */

export type BrasaoInfo = {
  temImagem: boolean;
  nomeArquivo: string | null;
  atualizadoEm: Date | null;
  urlExterna: string;
  /** Fonte efetiva usada na impressão. */
  origem: "banco" | "arquivo-publico" | "url" | "monograma";
  /** Endereço que o navegador deve carregar na imagem. */
  src: string | null;
  versao: string;
};

export async function salvarBrasao(dataUrl: string, nomeArquivo: string) {
  const [registro] = await db
    .update(configuracoes)
    .set({
      logoDados: dataUrl,
      logoNomeArquivo: nomeArquivo,
      logoAtualizadoEm: new Date(),
      atualizadoEm: new Date(),
    })
    .where(eq(configuracoes.id, 1))
    .returning();
  return registro;
}

export async function removerBrasao() {
  const [registro] = await db
    .update(configuracoes)
    .set({ logoDados: null, logoNomeArquivo: null, logoAtualizadoEm: new Date(), atualizadoEm: new Date() })
    .where(eq(configuracoes.id, 1))
    .returning();
  return registro;
}

/** Decide qual imagem usar no timbre: banco → arquivo em /public → URL externa → monograma. */
export function resolverBrasao(config: {
  logoDados?: string | null;
  logoUrl?: string | null;
  logoAtualizadoEm?: Date | null;
  logoNomeArquivo?: string | null;
} | null): BrasaoInfo {
  const versao = config?.logoAtualizadoEm ? new Date(config.logoAtualizadoEm).getTime().toString(36) : "0";
  const urlExterna = config?.logoUrl?.trim() ?? "";

  if (config?.logoDados) {
    return {
      temImagem: true,
      nomeArquivo: config.logoNomeArquivo ?? null,
      atualizadoEm: config.logoAtualizadoEm ?? null,
      urlExterna,
      origem: "banco",
      src: `/api/brasao?v=${versao}`,
      versao,
    };
  }

  if (urlExterna) {
    const ehArquivoPublico = urlExterna.startsWith("/");
    return {
      temImagem: true,
      nomeArquivo: null,
      atualizadoEm: config?.logoAtualizadoEm ?? null,
      urlExterna,
      origem: ehArquivoPublico ? "arquivo-publico" : "url",
      src: ehArquivoPublico ? `${urlExterna}?v=${versao}` : urlExterna,
      versao,
    };
  }

  return {
    temImagem: false,
    nomeArquivo: null,
    atualizadoEm: null,
    urlExterna: "",
    origem: "monograma",
    src: null,
    versao,
  };
}

export async function anosDisponiveis(): Promise<number[]> {
  const linhas = await db
    .select({ ano: documentos.ano })
    .from(documentos)
    .groupBy(documentos.ano)
    .orderBy(desc(documentos.ano));
  const anos = linhas.map((l) => Number(l.ano));
  const atual = Number(hojeISO().slice(0, 4));
  return Array.from(new Set([atual, atual - 1, ...anos])).sort((a, b) => b - a);
}
