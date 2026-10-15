CREATE TYPE "public"."grau_sigilo" AS ENUM('OSTENSIVO', 'RESTRITO', 'SIGILOSO');--> statement-breakpoint
CREATE TYPE "public"."meio_envio" AS ENUM('MALOTE', 'CORREIOS', 'EMAIL', 'PROTOCOLO_PRESENCIAL', 'SEI_ELETRONICO', 'FAX', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."movimentacao_documento" AS ENUM('EXPEDICAO', 'RECEBIMENTO');--> statement-breakpoint
CREATE TYPE "public"."prioridade" AS ENUM('NORMAL', 'URGENTE', 'MUITO_URGENTE');--> statement-breakpoint
CREATE TYPE "public"."status_documento" AS ENUM('RASCUNHO', 'EXPEDIDO', 'EM_TRANSITO', 'RECEBIDO', 'ARQUIVADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('RELACAO_REMESSA', 'OFICIO', 'OFICIO_APM', 'PROTOCOLO', 'PROCESSO', 'INFORMACAO');--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"orgao_nome" varchar(200) DEFAULT 'EE PROFA. MARLENE FRATTINI' NOT NULL,
	"orgao_unidade" varchar(200) DEFAULT 'Serviço de Expediente e Protocolo Escolar' NOT NULL,
	"orgao_sigla" varchar(20) DEFAULT 'EEPMF' NOT NULL,
	"endereco" varchar(200) DEFAULT '' NOT NULL,
	"cidade" varchar(120) DEFAULT '' NOT NULL,
	"uf" varchar(2) DEFAULT '' NOT NULL,
	"cep" varchar(12) DEFAULT '' NOT NULL,
	"telefone" varchar(40) DEFAULT '' NOT NULL,
	"email" varchar(160) DEFAULT '' NOT NULL,
	"site" varchar(160) DEFAULT '' NOT NULL,
	"responsavel_padrao" varchar(140) DEFAULT '' NOT NULL,
	"cargo_padrao" varchar(140) DEFAULT '' NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documento_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"documento_id" integer NOT NULL,
	"ordem" integer DEFAULT 1 NOT NULL,
	"descricao" varchar(240) NOT NULL,
	"numero_referencia" varchar(80),
	"quantidade" integer DEFAULT 1 NOT NULL,
	"valor" numeric(14, 2),
	"observacao" varchar(240)
);
--> statement-breakpoint
CREATE TABLE "documento_movimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"documento_id" integer NOT NULL,
	"status" "status_documento" NOT NULL,
	"descricao" varchar(240) NOT NULL,
	"usuario" varchar(140) DEFAULT 'Sistema' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"movimentacao" "movimentacao_documento" DEFAULT 'EXPEDICAO' NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"numero" varchar(40) NOT NULL,
	"numero_sequencial" integer NOT NULL,
	"numero_legado" varchar(40),
	"ano" integer NOT NULL,
	"data_documento" date NOT NULL,
	"data_expedicao" date,
	"prazo_resposta" date,
	"assunto" varchar(240) NOT NULL,
	"conteudo" text,
	"interessado" varchar(180),
	"numero_processo" varchar(80),
	"destinatario_nome" varchar(180),
	"destinatario_cargo" varchar(140),
	"setor_origem_id" integer,
	"setor_destino_id" integer,
	"responsavel" varchar(140) NOT NULL,
	"cargo_responsavel" varchar(140),
	"meio_envio" "meio_envio" DEFAULT 'MALOTE' NOT NULL,
	"prioridade" "prioridade" DEFAULT 'NORMAL' NOT NULL,
	"grau_sigilo" "grau_sigilo" DEFAULT 'OSTENSIVO' NOT NULL,
	"status" "status_documento" DEFAULT 'RASCUNHO' NOT NULL,
	"referencia_externa" varchar(120),
	"qtd_paginas" integer DEFAULT 1 NOT NULL,
	"qtd_anexos" integer DEFAULT 0 NOT NULL,
	"observacoes" text,
	"criado_por" varchar(140) DEFAULT 'Sistema' NOT NULL,
	"origem_externa" varchar(30),
	"origem_externa_id" varchar(80),
	"sincronizado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "numeracao" (
	"id" serial PRIMARY KEY NOT NULL,
	"movimentacao" "movimentacao_documento" DEFAULT 'EXPEDICAO' NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"ano" integer NOT NULL,
	"prefixo" varchar(14) NOT NULL,
	"digitos" integer DEFAULT 5 NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL,
	"chave_legada" varchar(120),
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setores" (
	"id" serial PRIMARY KEY NOT NULL,
	"sigla" varchar(30) NOT NULL,
	"nome" varchar(160) NOT NULL,
	"tipo" varchar(20) DEFAULT 'INTERNO' NOT NULL,
	"responsavel" varchar(140),
	"cargo" varchar(140),
	"email" varchar(160),
	"telefone" varchar(40),
	"endereco" varchar(200),
	"cidade" varchar(120),
	"uf" varchar(2),
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sincronizacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"origem" varchar(30) DEFAULT 'SUPABASE' NOT NULL,
	"tabelas" text DEFAULT '' NOT NULL,
	"analisados" integer DEFAULT 0 NOT NULL,
	"importados" integer DEFAULT 0 NOT NULL,
	"atualizados" integer DEFAULT 0 NOT NULL,
	"ignorados" integer DEFAULT 0 NOT NULL,
	"mensagem" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documento_itens" ADD CONSTRAINT "documento_itens_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_movimentos" ADD CONSTRAINT "documento_movimentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_setor_origem_id_setores_id_fk" FOREIGN KEY ("setor_origem_id") REFERENCES "public"."setores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_setor_destino_id_setores_id_fk" FOREIGN KEY ("setor_destino_id") REFERENCES "public"."setores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documentos_mov_tipo_ano_seq_idx" ON "documentos" USING btree ("movimentacao","tipo","ano","numero_sequencial");--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_origem_externa_idx" ON "documentos" USING btree ("origem_externa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "numeracao_mov_tipo_ano_idx" ON "numeracao" USING btree ("movimentacao","tipo","ano");--> statement-breakpoint
CREATE UNIQUE INDEX "setores_sigla_idx" ON "setores" USING btree ("sigla");