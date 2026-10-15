"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONFIG_STATUS, CONFIG_TIPO, STATUS_DOCUMENTO, TIPOS_DOCUMENTO } from "@/lib/domain";
import { botaoClasses, inputClasses, selectClasses } from "@/components/ui";

export function FiltrosRelatorio({
  valores,
  anos,
}: {
  valores: { de: string; ate: string; tipo: string; status: string; ano: string };
  anos: number[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(valores);
  const atualizar = (campo: string, valor: string) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const aplicar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const params = new URLSearchParams();
    Object.entries(form).forEach(([chave, valor]) => {
      if (!valor || valor === "TODOS") return;
      params.set(chave, valor);
    });
    const query = params.toString();
    router.push(`/relatorios${query ? `?${query}` : ""}`);
  };

  const exportar = () => {
    const params = new URLSearchParams();
    Object.entries(form).forEach(([chave, valor]) => {
      if (!valor || valor === "TODOS") return;
      params.set(chave, valor);
    });
    const query = params.toString();
    window.location.href = `/api/exportar/documentos${query ? `?${query}` : ""}`;
  };

  return (
    <form
      onSubmit={aplicar}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">Período — de</span>
          <input type="date" className={inputClasses} value={form.de} onChange={(e) => atualizar("de", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">até</span>
          <input type="date" className={inputClasses} value={form.ate} onChange={(e) => atualizar("ate", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">Exercício</span>
          <select className={selectClasses} value={form.ano} onChange={(e) => atualizar("ano", e.target.value)}>
            <option value="TODOS">Todos</option>
            {anos.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">Tipo</span>
          <select className={selectClasses} value={form.tipo} onChange={(e) => atualizar("tipo", e.target.value)}>
            <option value="TODOS">Todos</option>
            {TIPOS_DOCUMENTO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {CONFIG_TIPO[tipo].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">Situação</span>
          <select className={selectClasses} value={form.status} onChange={(e) => atualizar("status", e.target.value)}>
            <option value="TODOS">Todas</option>
            {STATUS_DOCUMENTO.map((status) => (
              <option key={status} value={status}>
                {CONFIG_STATUS[status].label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className={botaoClasses("primario")}>
            Aplicar
          </button>
          <button
            type="button"
            className={botaoClasses("secundario")}
            onClick={() => {
              setForm({ de: "", ate: "", tipo: "TODOS", status: "TODOS", ano: "TODOS" });
              router.push("/relatorios");
            }}
          >
            Limpar
          </button>
          <button type="button" className={botaoClasses("secundario")} onClick={exportar}>
            ⭳ Exportar CSV
          </button>
        </div>
      </div>
    </form>
  );
}
