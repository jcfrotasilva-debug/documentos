"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CONFIG_MOVIMENTACAO,
  CONFIG_PRIORIDADE,
  CONFIG_STATUS,
  CONFIG_TIPO,
  MOVIMENTACOES,
  PRIORIDADES,
  STATUS_DOCUMENTO,
  TIPOS_DOCUMENTO,
} from "@/lib/domain";
import { botaoClasses, inputClasses, selectClasses } from "@/components/ui";

export type FiltrosValores = {
  q: string;
  movimentacao: string;
  tipo: string;
  status: string;
  prioridade: string;
  ano: string;
  de: string;
  ate: string;
  ordenar: string;
  pageSize: string;
};

export function FiltrosDocumentos({
  valores,
  anos,
  total,
}: {
  valores: FiltrosValores;
  anos: number[];
  total: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FiltrosValores>(valores);
  const [avancado, setAvancado] = useState(Boolean(valores.de || valores.ate || valores.prioridade !== "TODOS"));

  const aplicar = (evento?: React.FormEvent) => {
    evento?.preventDefault();
    const params = new URLSearchParams();
    Object.entries({ ...form, page: "1" }).forEach(([chave, valor]) => {
      if (!valor || valor === "TODOS") return;
      params.set(chave, valor);
    });
    const query = params.toString();
    router.push(`/documentos${query ? `?${query}` : ""}`);
  };

  const limpar = () => {
    setForm({
      q: "",
      movimentacao: "TODOS",
      tipo: "TODOS",
      status: "TODOS",
      prioridade: "TODOS",
      ano: "TODOS",
      de: "",
      ate: "",
      ordenar: "recentes",
      pageSize: "15",
    });
    router.push("/documentos");
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

  const atualizar = (campo: keyof FiltrosValores, valor: string) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

  return (
    <form
      onSubmit={aplicar}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-xs font-semibold text-slate-700">Busca livre</span>
          <input
            className={inputClasses}
            placeholder="Número, assunto, interessado, nº do processo..."
            value={form.q}
            onChange={(evento) => atualizar("q", evento.target.value)}
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">Movimentação</span>
          <select
            className={selectClasses}
            value={form.movimentacao}
            onChange={(e) => atualizar("movimentacao", e.target.value)}
          >
            <option value="TODOS">Todas</option>
            {MOVIMENTACOES.map((valor) => (
              <option key={valor} value={valor}>
                {CONFIG_MOVIMENTACAO[valor].label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">Tipo</span>
          <select className={selectClasses} value={form.tipo} onChange={(e) => atualizar("tipo", e.target.value)}>
            <option value="TODOS">Todos os tipos</option>
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
          <span className="mb-1 block text-xs font-semibold text-slate-700">Ordenar</span>
          <select className={selectClasses} value={form.ordenar} onChange={(e) => atualizar("ordenar", e.target.value)}>
            <option value="recentes">Mais recentes</option>
            <option value="antigos">Mais antigos</option>
            <option value="numero">Número</option>
            <option value="assunto">Assunto (A-Z)</option>
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button type="submit" className={botaoClasses("primario")}>
            Filtrar
          </button>
          <button type="button" className={botaoClasses("secundario")} onClick={() => setAvancado((v) => !v)}>
            {avancado ? "Menos filtros" : "Mais filtros"}
          </button>
          <button type="button" className={botaoClasses("fantasma")} onClick={limpar}>
            Limpar
          </button>
          <button type="button" className={botaoClasses("secundario")} onClick={exportar} title="Exportar resultado em CSV">
            ⭳ CSV
          </button>
        </div>
      </div>

      {avancado && (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-4">
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-700">Registrado de</span>
            <input type="date" className={inputClasses} value={form.de} onChange={(e) => atualizar("de", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-700">Registrado até</span>
            <input type="date" className={inputClasses} value={form.ate} onChange={(e) => atualizar("ate", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-700">Prioridade</span>
            <select
              className={selectClasses}
              value={form.prioridade}
              onChange={(e) => atualizar("prioridade", e.target.value)}
            >
              <option value="TODOS">Todas</option>
              {PRIORIDADES.map((valor) => (
                <option key={valor} value={valor}>
                  {CONFIG_PRIORIDADE[valor].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-700">Registros por página</span>
            <select className={selectClasses} value={form.pageSize} onChange={(e) => atualizar("pageSize", e.target.value)}>
              {["10", "15", "25", "50", "100"].map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-500">{total} documento(s) no resultado atual.</p>
    </form>
  );
}
