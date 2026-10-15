"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Campo, botaoClasses, cx, inputClasses, selectClasses } from "@/components/ui";

export type SetorRegistro = {
  id: number;
  sigla: string;
  nome: string;
  tipo: string;
  responsavel: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
  documentos: number;
};

const vazio = {
  id: 0,
  sigla: "",
  nome: "",
  tipo: "INTERNO",
  responsavel: "",
  cargo: "",
  email: "",
  telefone: "",
  endereco: "",
  cidade: "",
  uf: "",
  ativo: true,
};

export function SetoresManager({ setores }: { setores: SetorRegistro[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...vazio });
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const editando = form.id > 0;
  const atualizar = (campo: keyof typeof vazio, valor: string | boolean) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    if (!form.sigla.trim() || !form.nome.trim()) {
      setErro("Sigla e nome da unidade são obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch("/api/setores", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const dados = (await resposta.json()) as { erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar a unidade.");
      } else {
        setAviso(editando ? "Unidade atualizada." : "Unidade cadastrada.");
        setForm({ ...vazio });
        router.refresh();
      }
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (setor: SetorRegistro) => {
    if (!window.confirm(`Excluir a unidade ${setor.sigla}?`)) return;
    const resposta = await fetch(`/api/setores/${setor.id}`, { method: "DELETE" });
    const dados = (await resposta.json()) as { erro?: string };
    if (!resposta.ok) {
      setErro(dados.erro ?? "Não foi possível excluir.");
      return;
    }
    setForm({ ...vazio });
    setAviso("Unidade excluída.");
    router.refresh();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card
        titulo="Unidades e órgãos cadastrados"
        subtitulo={`${setores.length} unidade(s) — utilizadas como origem e destino dos expedientes`}
        espacamento="p-0"
      >
        <div className="overflow-x-auto scroll-fino">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2 font-semibold">Sigla</th>
                <th className="px-3 py-2 font-semibold">Unidade</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Responsável</th>
                <th className="px-3 py-2 text-center font-semibold">Docs</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-5 py-2 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {setores.map((setor) => (
                <tr key={setor.id} className={cx("hover:bg-slate-50/70", form.id === setor.id && "bg-brand-50/60")}>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{setor.sigla}</td>
                  <td className="px-3 py-3">
                    <p className="text-slate-800">{setor.nome}</p>
                    <p className="text-[11px] text-slate-500">
                      {[setor.cidade, setor.uf].filter(Boolean).join("/") || "—"}
                      {setor.email ? ` · ${setor.email}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {setor.tipo === "EXTERNO" ? "Órgão externo" : "Unidade interna"}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {setor.responsavel ?? "—"}
                    {setor.cargo ? <span className="block text-[11px] text-slate-400">{setor.cargo}</span> : null}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-xs text-slate-600">{setor.documentos}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                        setor.ativo
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200",
                      )}
                    >
                      {setor.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1 text-xs">
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                        onClick={() =>
                          setForm({
                            id: setor.id,
                            sigla: setor.sigla,
                            nome: setor.nome,
                            tipo: setor.tipo,
                            responsavel: setor.responsavel ?? "",
                            cargo: setor.cargo ?? "",
                            email: setor.email ?? "",
                            telefone: setor.telefone ?? "",
                            endereco: setor.endereco ?? "",
                            cidade: setor.cidade ?? "",
                            uf: setor.uf ?? "",
                            ativo: setor.ativo,
                          })
                        }
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50"
                        onClick={() => excluir(setor)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        titulo={editando ? `Editar unidade ${form.sigla}` : "Nova unidade / órgão"}
        subtitulo="Dados usados no preenchimento automático do destinatário."
      >
        <form onSubmit={salvar} className="space-y-3">
          {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{erro}</p>}
          {aviso && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{aviso}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Sigla" obrigatorio>
              <input
                className={cx(inputClasses, "font-mono uppercase")}
                value={form.sigla}
                maxLength={30}
                onChange={(e) => atualizar("sigla", e.target.value)}
                placeholder="SEFIN"
              />
            </Campo>
            <Campo label="Natureza">
              <select className={selectClasses} value={form.tipo} onChange={(e) => atualizar("tipo", e.target.value)}>
                <option value="INTERNO">Unidade interna</option>
                <option value="EXTERNO">Órgão externo</option>
              </select>
            </Campo>
          </div>

          <Campo label="Nome da unidade" obrigatorio>
            <input
              className={inputClasses}
              value={form.nome}
              maxLength={160}
              onChange={(e) => atualizar("nome", e.target.value)}
              placeholder="Ex.: Diretoria de Ensino — Região de Campinas"
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Responsável">
              <input className={inputClasses} value={form.responsavel} onChange={(e) => atualizar("responsavel", e.target.value)} />
            </Campo>
            <Campo label="Cargo">
              <input className={inputClasses} value={form.cargo} onChange={(e) => atualizar("cargo", e.target.value)} />
            </Campo>
            <Campo label="E-mail">
              <input className={inputClasses} type="email" value={form.email} onChange={(e) => atualizar("email", e.target.value)} />
            </Campo>
            <Campo label="Telefone">
              <input className={inputClasses} value={form.telefone} onChange={(e) => atualizar("telefone", e.target.value)} />
            </Campo>
            <Campo label="Cidade" className="sm:col-span-1">
              <input className={inputClasses} value={form.cidade} onChange={(e) => atualizar("cidade", e.target.value)} />
            </Campo>
            <Campo label="UF">
              <input
                className={cx(inputClasses, "uppercase")}
                maxLength={2}
                value={form.uf}
                onChange={(e) => atualizar("uf", e.target.value)}
              />
            </Campo>
          </div>

          <Campo label="Endereço">
            <input className={inputClasses} value={form.endereco} onChange={(e) => atualizar("endereco", e.target.value)} />
          </Campo>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={form.ativo}
              onChange={(e) => atualizar("ativo", e.target.checked)}
            />
            Unidade ativa para novos lançamentos
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button type="submit" className={botaoClasses("primario")} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar unidade"}
            </button>
            {editando && (
              <button type="button" className={botaoClasses("secundario")} onClick={() => setForm({ ...vazio })}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
