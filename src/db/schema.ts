import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

/* Espécies documentais identificadas na base oficial (Supabase).      */
export const tipoDocumentoEnum = pgEnum("tipo_documento", [
  "RELACAO_REMESSA",
  "OFICIO",
  "OFICIO_APM",
  "PROTOCOLO",
  "PROCESSO",
  "INFORMACAO",
]);

export const movimentacaoEnum = pgEnum("movimentacao_documento", ["EXPEDICAO", "RECEBIMENTO"]);

export const statusDocumentoEnum = pgEnum("status_documento", [
  "RASCUNHO",
  "EXPEDIDO",
  "EM_TRANSITO",
  "RECEBIDO",
  "ARQUIVADO",
  "CANCELADO",
]);

export const prioridadeEnum = pgEnum("prioridade", ["NORMAL", "URGENTE", "MUITO_URGENTE"]);

export const grauSigiloEnum = pgEnum("grau_sigilo", ["OSTENSIVO", "RESTRITO", "SIGILOSO"]);

export const meioEnvioEnum = pgEnum("meio_envio", [
  "MALOTE",
  "CORREIOS",
  "EMAIL",
  "PROTOCOLO_PRESENCIAL",
  "SEI_ELETRONICO",
  "FAX",
  "OUTRO",
]);

/* ------------------------------------------------------------------ */
/* Setores / Unidades                                                 */
/* ------------------------------------------------------------------ */

export const setores = pgTable(
  "setores",
  {
    id: serial("id").primaryKey(),
    sigla: varchar("sigla", { length: 30 }).notNull(),
    nome: varchar("nome", { length: 160 }).notNull(),
    tipo: varchar("tipo", { length: 20 }).notNull().default("INTERNO"),
    responsavel: varchar("responsavel", { length: 140 }),
    cargo: varchar("cargo", { length: 140 }),
    email: varchar("email", { length: 160 }),
    telefone: varchar("telefone", { length: 40 }),
    endereco: varchar("endereco", { length: 200 }),
    cidade: varchar("cidade", { length: 120 }),
    uf: varchar("uf", { length: 2 }),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("setores_sigla_idx").on(table.sigla)],
);

/* ------------------------------------------------------------------ */
/* Responsáveis pela emissão de documentos                            */
/* ------------------------------------------------------------------ */

export const responsaveis = pgTable(
  "responsaveis",
  {
    id: serial("id").primaryKey(),
    nome: varchar("nome", { length: 140 }).notNull(),
    cargo: varchar("cargo", { length: 140 }),
    matricula: varchar("matricula", { length: 40 }),
    documentoIdentidade: varchar("documento_identidade", { length: 40 }),
    email: varchar("email", { length: 160 }),
    telefone: varchar("telefone", { length: 40 }),
    lotacao: varchar("lotacao", { length: 160 }),
    observacoes: text("observacoes"),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("responsaveis_nome_idx").on(table.nome)],
);

/* ------------------------------------------------------------------ */
/* Documentos (expedição e recebimento)                               */
/* ------------------------------------------------------------------ */

export const documentos = pgTable(
  "documentos",
  {
    id: serial("id").primaryKey(),
    movimentacao: movimentacaoEnum("movimentacao").notNull().default("EXPEDICAO"),
    tipo: tipoDocumentoEnum("tipo").notNull(),
    numero: varchar("numero", { length: 40 }).notNull(),
    numeroSequencial: integer("numero_sequencial").notNull(),
    numeroLegado: varchar("numero_legado", { length: 40 }),
    ano: integer("ano").notNull(),
    dataDocumento: date("data_documento", { mode: "string" }).notNull(),
    dataExpedicao: date("data_expedicao", { mode: "string" }),
    prazoResposta: date("prazo_resposta", { mode: "string" }),
    assunto: varchar("assunto", { length: 240 }).notNull(),
    conteudo: text("conteudo"),
    interessado: varchar("interessado", { length: 180 }),
    numeroProcesso: varchar("numero_processo", { length: 80 }),
    /* Campos legados: os expedientes usam o campo `interessado`.
       São mantidos apenas para leitura do acervo antigo. */
    destinatarioNome: varchar("destinatario_nome", { length: 180 }),
    destinatarioCargo: varchar("destinatario_cargo", { length: 140 }),
    setorOrigemId: integer("setor_origem_id").references(() => setores.id, {
      onDelete: "set null",
    }),
    setorDestinoId: integer("setor_destino_id").references(() => setores.id, {
      onDelete: "set null",
    }),
    responsavel: varchar("responsavel", { length: 140 }).notNull(),
    cargoResponsavel: varchar("cargo_responsavel", { length: 140 }),
    meioEnvio: meioEnvioEnum("meio_envio").notNull().default("MALOTE"),
    prioridade: prioridadeEnum("prioridade").notNull().default("NORMAL"),
    grauSigilo: grauSigiloEnum("grau_sigilo").notNull().default("OSTENSIVO"),
    status: statusDocumentoEnum("status").notNull().default("RASCUNHO"),
    referenciaExterna: varchar("referencia_externa", { length: 120 }),
    qtdPaginas: integer("qtd_paginas").notNull().default(1),
    qtdAnexos: integer("qtd_anexos").notNull().default(0),
    observacoes: text("observacoes"),
    criadoPor: varchar("criado_por", { length: 140 }).notNull().default("Sistema"),
    origemExterna: varchar("origem_externa", { length: 30 }),
    origemExternaId: varchar("origem_externa_id", { length: 80 }),
    sincronizadoEm: timestamp("sincronizado_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /* Índice simples: a base oficial pode repetir o número quando um documento
       é cancelado e reemitido, e o histórico precisa ser preservado. */
    index("documentos_mov_tipo_ano_seq_idx").on(
      table.movimentacao,
      table.tipo,
      table.ano,
      table.numeroSequencial,
    ),
    uniqueIndex("documentos_origem_externa_idx").on(table.origemExternaId),
  ],
);

/* ------------------------------------------------------------------ */
/* Itens da Relação de Remessa                                        */
/* ------------------------------------------------------------------ */

export const documentoItens = pgTable("documento_itens", {
  id: serial("id").primaryKey(),
  documentoId: integer("documento_id")
    .notNull()
    .references(() => documentos.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull().default(1),
  descricao: varchar("descricao", { length: 240 }).notNull(),
  numeroReferencia: varchar("numero_referencia", { length: 80 }),
  quantidade: integer("quantidade").notNull().default(1),
  valor: numeric("valor", { precision: 14, scale: 2 }),
  observacao: varchar("observacao", { length: 240 }),
});

/* ------------------------------------------------------------------ */
/* Movimentação / trilha do documento                                 */
/* ------------------------------------------------------------------ */

export const documentoMovimentos = pgTable("documento_movimentos", {
  id: serial("id").primaryKey(),
  documentoId: integer("documento_id")
    .notNull()
    .references(() => documentos.id, { onDelete: "cascade" }),
  status: statusDocumentoEnum("status").notNull(),
  descricao: varchar("descricao", { length: 240 }).notNull(),
  usuario: varchar("usuario", { length: 140 }).notNull().default("Sistema"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Numeração automática (movimentação + tipo + ano)                   */
/* ------------------------------------------------------------------ */

export const numeracao = pgTable(
  "numeracao",
  {
    id: serial("id").primaryKey(),
    movimentacao: movimentacaoEnum("movimentacao").notNull().default("EXPEDICAO"),
    tipo: tipoDocumentoEnum("tipo").notNull(),
    ano: integer("ano").notNull(),
    prefixo: varchar("prefixo", { length: 14 }).notNull(),
    digitos: integer("digitos").notNull().default(5),
    ultimoNumero: integer("ultimo_numero").notNull().default(0),
    chaveLegada: varchar("chave_legada", { length: 120 }),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("numeracao_mov_tipo_ano_idx").on(table.movimentacao, table.tipo, table.ano),
  ],
);

/* ------------------------------------------------------------------ */
/* Sincronização com a base oficial                                   */
/* ------------------------------------------------------------------ */

export const sincronizacoes = pgTable("sincronizacoes", {
  id: serial("id").primaryKey(),
  origem: varchar("origem", { length: 30 }).notNull().default("SUPABASE"),
  tabelas: text("tabelas").notNull().default(""),
  analisados: integer("analisados").notNull().default(0),
  importados: integer("importados").notNull().default(0),
  atualizados: integer("atualizados").notNull().default(0),
  ignorados: integer("ignorados").notNull().default(0),
  mensagem: text("mensagem"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Configuração institucional (registro único)                        */
/* ------------------------------------------------------------------ */

export const configuracoes = pgTable("configuracoes", {
  id: integer("id").primaryKey().default(1),
  orgaoNome: varchar("orgao_nome", { length: 200 }).notNull().default("EE PROFA. MARLENE FRATTINI"),
  orgaoUnidade: varchar("orgao_unidade", { length: 200 })
    .notNull()
    .default("Serviço de Expediente e Protocolo Escolar"),
  orgaoSigla: varchar("orgao_sigla", { length: 20 }).notNull().default("EEPMF"),
  /* Linhas de hierarquia do timbre, separadas por "|". Ex.:
     GOVERNO DO ESTADO DE SÃO PAULO|SECRETARIA DE ESTADO DA EDUCAÇÃO */
  orgaoHierarquia: varchar("orgao_hierarquia", { length: 400 })
    .notNull()
    .default("GOVERNO DO ESTADO DE SÃO PAULO|SECRETARIA DE ESTADO DA EDUCAÇÃO"),
  /* Brasão oficial: URL ou caminho em /public (ex.: /brasao.png). Vazio = monograma. */
  logoUrl: varchar("logo_url", { length: 300 }).notNull().default(""),
  endereco: varchar("endereco", { length: 200 }).notNull().default(""),
  cidade: varchar("cidade", { length: 120 }).notNull().default(""),
  uf: varchar("uf", { length: 2 }).notNull().default(""),
  cep: varchar("cep", { length: 12 }).notNull().default(""),
  telefone: varchar("telefone", { length: 40 }).notNull().default(""),
  email: varchar("email", { length: 160 }).notNull().default(""),
  site: varchar("site", { length: 160 }).notNull().default(""),
  responsavelPadrao: varchar("responsavel_padrao", { length: 140 }).notNull().default(""),
  cargoPadrao: varchar("cargo_padrao", { length: 140 }).notNull().default(""),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Documento = typeof documentos.$inferSelect;
export type DocumentoInsert = typeof documentos.$inferInsert;
export type DocumentoItem = typeof documentoItens.$inferSelect;
export type DocumentoMovimento = typeof documentoMovimentos.$inferSelect;
export type Setor = typeof setores.$inferSelect;
export type Responsavel = typeof responsaveis.$inferSelect;
export type Numeracao = typeof numeracao.$inferSelect;
export type Configuracao = typeof configuracoes.$inferSelect;
export type Sincronizacao = typeof sincronizacoes.$inferSelect;
