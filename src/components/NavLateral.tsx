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
          "no-print fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-transform lg:flex lg:translate-x-0",
          aberto ? "flex translate-x-0" : "hidden -translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
            {sigla.slice(0, 4)}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Controle de Expedientes</p>
            <p className="text-[11px] text-slate-400">Expedição e recebimento de documentos</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scroll-fino">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Navegação
          </p>
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                ativo(item.href)
                  ? "bg-brand-600/20 font-semibold text-white ring-1 ring-inset ring-brand-500/40"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <span className="w-4 text-center text-xs opacity-80">{item.icone}</span>
              {item.rotulo}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-800 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unidade escolar</p>
          <p className="mt-1 text-xs text-slate-300">{orgao}</p>
        </div>
      </aside>
    </>
  );
}
