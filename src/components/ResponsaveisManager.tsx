"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatarData } from "@/lib/format";
import { Campo, Card, botaoClasses, cx, inputClasses } from "@/components/ui";

export type ResponsavelRegistro = {
  id: number;
  nome: string;
  cargo: string | null;
  matricula: string | null;
  documentoIdentidade: string | null;
  email: string | null;
  telefone: string | null;
  lotacao: string | null;
  observacoes: string | null;
  ativo: boolean;
  documentos: number;
  ultimaEmissao: string | null;
};

const vazio = {
  id: 0,
  nome: "",
  cargo: "",
  matricula: "",
  documentoIdentidade: "",
  email: "",
  telefone: "",
  lotacao: "",
  observacoes: "",
  ativo: true,
};

export function ResponsaveisManager({ responsaveis }: { responsaveis: ResponsavelRegistro[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...vazio });
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");

  const editando = form.id > 0;
  const atualizar = (campo: keyof typeof vazio, valor: string | boolean) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

  const filtrados = responsaveis.filter((registro) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return [registro.nome, registro.cargo, registro.matricula, registro.lotacao, registro.email]
      .filter(Boolean)
      .some((valor) => String(valor).toLowerCase().includes(termo));
  });

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    if (!form.nome.trim()) {
      setErro("Informe o nome do responsável.");
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch("/api/responsaveis", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sincronizar: true }),
      });
      const dados = (await resposta.json()) as { erro?: string; mensagem?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar o responsável.");
      } else {
        setAviso(dados.mensagem ?? (editando ? "Responsável atualizado." : "Responsável cadastrado."));
        setForm({ ...vazio });
        router.refresh();
      }
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (registro: ResponsavelRegistro) => {
    if (!window.confirm(`Excluir o responsável ${registro.nome}?`)) return;
    setErro(null);
    setAviso(null);
    const resposta = await fetch(`/api/responsaveis/${registro.id}`, { method: "DELETE" });
    const dados = (await resposta.json()) as { erro?: string };
    if (!resposta.ok) {
      setErro(dados.erro ?? "Não foi possível excluir.");
      return;
    }
    setForm({ ...vazio });
    setAviso("Responsável excluído.");
    router.refresh();
  };

  const importarDoAcervo = async () => {
    if (!window.confirm("Cadastrar como responsáveis todos os nomes que já assinam documentos no acervo?")) return;
    setErro(null);
    setAviso(null);
    setSalvando(true);
    try {
      const resposta = await fetch("/api/responsaveis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "importar-do-acervo" }),
      });
      const dados = (await resposta.json()) as { erro?: string; mensagem?: string };
      if (!resposta.ok) setErro(dados.erro ?? "Falha na importação.");
      else {
        setAviso(dados.mensagem ?? "Importação concluída.");
        router.refresh();
      }
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card
        titulo="Responsáveis cadastrados"
        subtitulo={`${responsaveis.length} pessoa(s) — selecionáveis no cadastro de expedientes e impressas na assinatura`}
        espacamento="p-0"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={cx(inputClasses, "w-44 py-1 text-xs")}
              placeholder="Buscar nome, cargo, matrícula..."
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
            <a href="/api/exportar/responsaveis" className={cx(botaoClasses("secundario"), "px-2 py-1 text-xs")}>
              ⭳ CSV
            </a>
            <button
              type="button"
              className={cx(botaoClasses("secundario"), "px-2 py-1 text-xs")}
              onClick={importarDoAcervo}
              disabled={salvando}
              title="Cria registros a partir dos nomes já usados em documentos"
            >
              Importar do acervo
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto scroll-fino">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2 font-semibold">Responsável</th>
                <th className="px-3 py-2 font-semibold">Matrícula</th>
                <th className="px-3 py-2 font-semibold">Lotação</th>
                <th className="px-3 py-2 font-semibold">Contato</th>
                <th className="px-3 py-2 text-center font-semibold">Emissões</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-5 py-2 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((registro) => (
                <tr key={registro.id} className={cx("hover:bg-slate-50/70", form.id === registro.id && "bg-brand-50/60")}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{registro.nome}</p>
                    <p className="text-[11px] text-slate-500">{registro.cargo ?? "cargo não informado"}</p>
                    {registro.documentoIdentidade && (
                      <p className="text-[11px] text-slate-400">doc. {registro.documentoIdentidade}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600">
                    {registro.matricula ?? <span className="font-sans text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {registro.lotacao ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">
                    {registro.email && <span className="block">{registro.email}</span>}
                    {registro.telefone && <span className="block text-slate-500">{registro.telefone}</span>}
                    {!registro.email && !registro.telefone && <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="tabular-nums font-semibold text-slate-700">{registro.documentos}</span>
                    {registro.ultimaEmissao && (
                      <span className="block text-[10px] text-slate-400">últ. {formatarData(registro.ultimaEmissao)}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                        registro.ativo
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200",
                      )}
                    >
                      {registro.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1 text-xs">
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                        onClick={() =>
                          setForm({
                            id: registro.id,
                            nome: registro.nome,
                            cargo: registro.cargo ?? "",
                            matricula: registro.matricula ?? "",
                            documentoIdentidade: registro.documentoIdentidade ?? "",
                            email: registro.email ?? "",
                            telefone: registro.telefone ?? "",
                            lotacao: registro.lotacao ?? "",
                            observacoes: registro.observacoes ?? "",
                            ativo: registro.ativo,
                          })
                        }
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50"
                        onClick={() => excluir(registro)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-500">
                    {responsaveis.length === 0
                      ? "Nenhum responsável cadastrado. Use o formulário ao lado ou importe os nomes já presentes no acervo."
                      : "Nenhum responsável corresponde à busca."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        titulo={editando ? `Editar ${form.nome}` : "Cadastrar responsável"}
        subtitulo="Quem assina e responde pela emissão dos documentos da unidade escolar."
      >
        <form onSubmit={salvar} className="space-y-3">
          {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{erro}</p>}
          {aviso && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{aviso}</p>}

          <Campo label="Nome completo" obrigatorio>
            <input
              className={inputClasses}
              value={form.nome}
              maxLength={140}
              onChange={(e) => atualizar("nome", e.target.value)}
              placeholder="Ex.: Marisa Antunes de Oliveira"
            />
          </Campo>

          <Campo label="Cargo / função" dica="Aparece sob a assinatura nos documentos impressos.">
            <input
              className={inputClasses}
              value={form.cargo}
              maxLength={140}
              onChange={(e) => atualizar("cargo", e.target.value)}
              placeholder="Ex.: Diretora de Escola"
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Matrícula / RF">
              <input
                className={cx(inputClasses, "font-mono")}
                value={form.matricula}
                maxLength={40}
                onChange={(e) => atualizar("matricula", e.target.value)}
                placeholder="Ex.: 20431"
              />
            </Campo>
            <Campo label="RG / documento">
              <input
                className={inputClasses}
                value={form.documentoIdentidade}
                maxLength={40}
                onChange={(e) => atualizar("documentoIdentidade", e.target.value)}
              />
            </Campo>
            <Campo label="E-mail institucional">
              <input
                className={inputClasses}
                type="email"
                value={form.email}
                maxLength={160}
                onChange={(e) => atualizar("email", e.target.value)}
              />
            </Campo>
            <Campo label="Telefone">
              <input className={inputClasses} value={form.telefone} maxLength={40} onChange={(e) => atualizar("telefone", e.target.value)} />
            </Campo>
          </div>

          <Campo label="Lotação / setor" dica="Setor de exercício dentro da unidade escolar.">
            <input
              className={inputClasses}
              value={form.lotacao}
              maxLength={160}
              onChange={(e) => atualizar("lotacao", e.target.value)}
              placeholder="Ex.: Secretaria da Escola"
            />
          </Campo>

          <Campo label="Observações">
            <textarea
              className={cx(inputClasses, "min-h-16 resize-y")}
              value={form.observacoes}
              onChange={(e) => atualizar("observacoes", e.target.value)}
            />
          </Campo>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={form.ativo}
              onChange={(e) => atualizar("ativo", e.target.checked)}
            />
            Ativo para novas emissões
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button type="submit" className={botaoClasses("primario")} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar responsável"}
            </button>
            {editando && (
              <button type="button" className={botaoClasses("secundario")} onClick={() => setForm({ ...vazio })}>
                Cancelar edição
              </button>
            )}
          </div>

          <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            Ao alterar <strong>nome</strong> ou <strong>cargo</strong>, o sistema atualiza automaticamente os documentos
            já assinados por esta pessoa, mantendo o acervo coerente.
          </p>
        </form>
      </Card>
    </div>
  );
}
