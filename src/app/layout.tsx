import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DiagnosticoFalha } from "@/components/DiagnosticoFalha";
import { NavLateral } from "@/components/NavLateral";
import { botaoClasses } from "@/components/ui";
import { diagnosticarBanco, infoConexao } from "@/db";
import { anoAtual } from "@/lib/format";
import { buscarConfiguracao } from "@/lib/services/documentos";
import "./globals.css";

export const metadata: Metadata = {
  title: "SICED · Controle de Expedientes Escolares",
  description:
    "Sistema de controle de expedientes da EE Profa. Marlene Frattini: relação de remessa, ofícios, ofícios APM, protocolo, processos e informações, com numeração automática.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  /* Verificação de integridade do banco antes de renderizar as páginas:
     evita a tela genérica de "server error" quando o ambiente está mal configurado. */
  const banco = await diagnosticarBanco();
  const pronto = banco.configurado && banco.conectado && banco.faltando.length === 0;

  if (!pronto) {
    return (
      <html lang="pt-BR">
        <body className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 antialiased">
          <DiagnosticoFalha
            banco={banco}
            conexao={infoConexao()}
            ambiente={process.env.NODE_ENV === "production" ? "produção" : "desenvolvimento"}
          />
        </body>
      </html>
    );
  }

  let sigla = "EEPMF";
  let orgao = "Unidade escolar não configurada";
  try {
    const config = await buscarConfiguracao();
    sigla = config?.orgaoSigla?.trim() || sigla;
    const rotulo = [config?.orgaoNome, config?.orgaoUnidade].map((valor) => valor?.trim()).filter(Boolean);
    if (rotulo.length > 0) orgao = rotulo.join(" · ");
    if (!config?.orgaoSigla?.trim() && config?.orgaoNome) sigla = config.orgaoNome.slice(0, 4);
  } catch {
    /* banco recém-validado: layout segue com os padrões */
  }

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <NavLateral sigla={sigla} orgao={orgao} />
        <div className="lg:pl-64">
          <header className="app-header sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 pl-20 lg:px-8 lg:pl-8">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Sistema de Controle de Expedientes Escolares
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  Numeração automática · Expedição e Recebimento · Relação de Remessa · Ofícios · Ofícios APM ·
                  Protocolo · Processos · Informações
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/diagnostico" className={botaoClasses("fantasma")}>
                  Diagnóstico
                </Link>
                <Link href="/documentos" className={botaoClasses("secundario")}>
                  Consultar acervo
                </Link>
                <Link href="/documentos/novo" className={botaoClasses("primario")}>
                  + Novo documento
                </Link>
              </div>
            </div>
          </header>
          <main className="app-main mx-auto max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
          <footer className="no-print mx-auto max-w-[1500px] px-4 pb-8 text-[11px] text-slate-400 lg:px-8">
            SICED · {anoAtual()} — expediente escolar com rastreabilidade de movimentações.
          </footer>
        </div>
      </body>
    </html>
  );
}
