"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/components/ui";

const ITENS = [
  { href: "/", rotulo: "Painel geral", icone: "▦" },
  { href: "/documentos", rotulo: "Documentos expedidos e recebidos", icone: "▤" },
  { href: "/documentos/novo", rotulo: "Novo expediente", icone: "＋" },
  { href: "/relatorios", rotulo: "Relatórios", icone: "▧" },
  { href: "/responsaveis", rotulo: "Responsáveis por emissão", icone: "✒" },
  { href: "/setores", rotulo: "Unidades / setores", icone: "◫" },
  { href: "/configuracoes", rotulo: "Numeração e órgão", icone: "⚙" },
  { href: "/supabase", rotulo: "Base oficial (Supabase)", icone: "☁" },
  { href: "/diagnostico", rotulo: "Diagnóstico do ambiente", icone: "◎" },
];

export function NavLateral({ sigla, orgao }: { sigla: string; orgao: string }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  const ativo = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/documentos") return pathname === "/documentos" || /^\/documentos\/\d+/.test(pathname);
    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className="no-print fixed left-4 top-3 z-50 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm lg:hidden"
      >
        ☰ Menu
      </button>

      <aside
        className={cx(
          "no-print fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col border-r border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100 shadow-[1px_0_12px_rgba(15,23,42,0.05)] transition-transform lg:flex lg:translate-x-0",
          aberto ? "flex translate-x-0" : "hidden -translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
            {sigla.slice(0, 4)}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-800">Controle de Expedientes</p>
            <p className="text-[11px] text-slate-500">Expedição e recebimento de documentos</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scroll-fino">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Navegação</p>
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                ativo(item.href)
                  ? "bg-white font-semibold text-brand-700 shadow-sm ring-1 ring-inset ring-brand-100"
                  : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
              )}
            >
              <span
                className={cx(
                  "w-4 text-center text-xs",
                  ativo(item.href) ? "text-brand-600" : "text-slate-400",
                )}
              >
                {item.icone}
              </span>
              {item.rotulo}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-200/80 bg-white/60 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unidade escolar</p>
          <p className="mt-1 text-xs text-slate-600">{orgao}</p>
        </div>
      </aside>
    </>
  );
}
