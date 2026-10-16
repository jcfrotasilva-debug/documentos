ALTER TABLE "configuracoes" ADD COLUMN "logo_dados" text;--> statement-breakpoint
ALTER TABLE "configuracoes" ADD COLUMN "logo_nome_arquivo" varchar(200);--> statement-breakpoint
ALTER TABLE "configuracoes" ADD COLUMN "logo_atualizado_em" timestamp with time zone;