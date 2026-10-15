CREATE TABLE "responsaveis" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(140) NOT NULL,
	"cargo" varchar(140),
	"matricula" varchar(40),
	"documento_identidade" varchar(40),
	"email" varchar(160),
	"telefone" varchar(40),
	"lotacao" varchar(160),
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "responsaveis_nome_idx" ON "responsaveis" USING btree ("nome");