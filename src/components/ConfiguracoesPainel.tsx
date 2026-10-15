"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CONFIG_MOVIMENTACAO,
  CONFIG_TIPO,
  MOVIMENTACOES,
  TIPOS_DOCUMENTO,
  prefixoPadrao,
  type Movimentacao,
  type TipoDocumento,
} from "@/lib/domain";
import { montarNumero } from "@/lib/format";
import { Campo, Card, botaoClasses, cx, inputClasses } from "@/components/ui";

export type ConfiguracaoValores = {
  orgaoNome: string;
  orgaoUnidade: string;
  orgaoSigla: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  site: string;
  responsavelPadrao: string;
  cargoPadrao: string;
};

export type LinhaNumeracao = {
  movimentacao: Movimentacao;
  tipo: TipoDocumento;
  prefixo: string;
  digitos: number;
  ultimoNumero: number;
  chaveLegada?: string | null;
};

const chave = (linha: LinhaNumeracao) => `${linha.movimentacao}:${linha.tipo}`;

export function ConfiguracoesPainel({
  configuracao,
  numeracao,
  ano,
  anos,
}: {
  configuracao: ConfiguracaoValores;
  numeracao: LinhaNumeracao[];
  ano: number;
  anos: number[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(configuracao);
  const [linhas, setLinhas] = useState(numeracao);
  const [anoSel, setAnoSel] = useState(ano);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const atualizarForm = (campo: keyof ConfiguracaoValores, valor: string) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

  const atualizarLinha = (movimentacao: Movimentacao, tipo: TipoDocumento, campo: string, valor: string | number) =>
    setLinhas((atual) =>
      atual.map((linha) =>
        linha.movimentacao === movimentacao && linha.tipo === tipo
          ? ({ ...linha, [campo]: valor } as LinhaNumeracao)
          : linha,
      ),
    );

  const salvarOrgao = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);
    setSalvando("orgao");
    try {
      const resposta = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const dados = (await resposta.json()) as { erro?: string };
      if (!resposta.ok) setErro(dados.erro ?? "Não foi possível salvar a configuração.");
      else {
        setMensagem("Dados institucionais atualizados.");
        router.refresh();
      }
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setSalvando(null);
    }
  };

  const salvarNumeracao = async (linha: LinhaNumeracao) => {
    setErro(null);
    setMensagem(null);
    setSalvando(chave(linha));
    try {
      const resposta = await fetch("/api/numeracao", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movimentacao: linha.movimentacao,
          tipo: linha.tipo,
          ano: anoSel,
          prefixo: linha.prefixo,
          digitos: linha.digitos,
          ultimoNumero: linha.ultimoNumero,
        }),
      });
      const dados = (await resposta.json()) as { erro?: string };
      if (!resposta.ok) setErro(dados.erro ?? "Não foi possível salvar a numeração.");
      else {
        setMensagem(
          `Numeração de ${CONFIG_MOVIMENTACAO[linha.movimentacao].label} · ${CONFIG_TIPO[linha.tipo].label} atualizada (${anoSel}).`,
        );
        router.refresh();
      }
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setSalvando(null);
    }
  };

  const trocarAno = (novoAno: number) => {
    setAnoSel(novoAno);
    fetch(`/api/numeracao?ano=${novoAno}`)
      .then((resposta) => resposta.json())
      .then(
        (dados: {
          numeracao?: { movimentacao: Movimentacao; tipo: TipoDocumento; prefixo: string; digitos: number; ultimoNumero: number; chaveLegada: string | null }[];
        }) => {
          const mapa = new Map((dados.numeracao ?? []).map((linha) => [chave(linha), linha]));
          setLinhas(
            MOVIMENTACOES.flatMap((movimentacao) =>
              TIPOS_DOCUMENTO.map((tipo) => {
                const encontrada = mapa.get(`${movimentacao}:${tipo}`);
                return {
                  movimentacao,
                  tipo,
                  prefixo: encontrada?.prefixo ?? prefixoPadrao(movimentacao, tipo),
                  digitos: encontrada?.digitos ?? 5,
                  ultimoNumero: encontrada?.ultimoNumero ?? 0,
                  chaveLegada: encontrada?.chaveLegada ?? null,
                };
              }),
            ),
          );
        },
      )
      .catch(() => undefined);
  };

  return (
    <div className="space-y-5">
      {mensagem && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</p>
      )}
      {erro && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}

      <Card
        titulo="Regras de numeração automática"
        subtitulo="Chave de numeração: movimentação + espécie + exercício, no mesmo padrão dos contadores da base oficial (EXPEDIÇÃO_OFÍCIO_2026)."
        acoes={
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Exercício
            <select
              className={cx(inputClasses, "w-28 py-1")}
              value={anoSel}
              onChange={(evento) => trocarAno(Number(evento.target.value))}
            >
              {Array.from(new Set([anoSel, ...anos]))
                .sort((a, b) => b - a)
                .map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
            </select>
          </label>
        }
        espacamento="p-0"
      >
        <div className="overflow-x-auto scroll-fino">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2 font-semibold">Movimentação</th>
                <th className="px-3 py-2 font-semibold">Espécie</th>
                <th className="px-3 py-2 font-semibold">Prefixo</th>
                <th className="px-3 py-2 font-semibold">Dígitos</th>
                <th className="px-3 py-2 font-semibold">Último nº</th>
                <th className="px-3 py-2 font-semibold">Próximo número</th>
                <th className="px-5 py-2 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOVIMENTACOES.flatMap((movimentacao) =>
                TIPOS_DOCUMENTO.map((tipo) => {
                  const linha = linhas.find((item) => item.movimentacao === movimentacao && item.tipo === tipo);
                  if (!linha) return null;
                  return (
                    <tr key={chave(linha)} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", CONFIG_MOVIMENTACAO[movimentacao].chip)}>
                          {CONFIG_MOVIMENTACAO[movimentacao].seta} {CONFIG_MOVIMENTACAO[movimentacao].label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">{CONFIG_TIPO[tipo].label}</p>
                        <p className="text-[11px] text-slate-500">origem: {CONFIG_TIPO[tipo].legado}</p>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          className={cx(inputClasses, "w-24 py-1 font-mono uppercase")}
                          maxLength={14}
                          value={linha.prefixo}
                          onChange={(evento) => atualizarLinha(movimentacao, tipo, "prefixo", evento.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={1}
                          max={8}
                          className={cx(inputClasses, "w-20 py-1")}
                          value={linha.digitos}
                          onChange={(evento) => atualizarLinha(movimentacao, tipo, "digitos", Number(evento.target.value))}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          className={cx(inputClasses, "w-24 py-1 tabular-nums")}
                          value={linha.ultimoNumero}
                          onChange={(evento) =>
                            atualizarLinha(movimentacao, tipo, "ultimoNumero", Number(evento.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-brand-700">
                        {montarNumero(linha.prefixo || prefixoPadrao(movimentacao, tipo), linha.ultimoNumero + 1, linha.digitos, anoSel)}
                        {linha.chaveLegada && (
                          <span className="block font-sans text-[10px] font-normal text-slate-400">
                            contador: {linha.chaveLegada}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          className={cx(botaoClasses("secundario"), "px-2 py-1 text-xs")}
                          disabled={salvando === chave(linha)}
                          onClick={() => salvarNumeracao(linha)}
                        >
                          {salvando === chave(linha) ? "Salvando..." : "Salvar"}
                        </button>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          A numeração de recebimento usa o prefixo &ldquo;R-&rdquo; para não colidir com a sequência de expedição da mesma espécie.
        </p>
      </Card>

      <Card titulo="Dados institucionais" subtitulo="Informações impressas no cabeçalho dos documentos expedidos.">
        <form onSubmit={salvarOrgao} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Campo label="Órgão" obrigatorio className="md:col-span-2">
              <input className={inputClasses} value={form.orgaoNome} onChange={(e) => atualizarForm("orgaoNome", e.target.value)} required />
            </Campo>
            <Campo label="Sigla" obrigatorio dica="Usada no timbre da impressão.">
              <input className={inputClasses} value={form.orgaoSigla} onChange={(e) => atualizarForm("orgaoSigla", e.target.value)} required />
            </Campo>
            <Campo label="Unidade emissora" obrigatorio className="md:col-span-3">
              <input className={inputClasses} value={form.orgaoUnidade} onChange={(e) => atualizarForm("orgaoUnidade", e.target.value)} required />
            </Campo>
            <Campo label="Endereço" className="md:col-span-2">
              <input className={inputClasses} value={form.endereco} onChange={(e) => atualizarForm("endereco", e.target.value)} />
            </Campo>
            <Campo label="CEP">
              <input className={inputClasses} value={form.cep} onChange={(e) => atualizarForm("cep", e.target.value)} />
            </Campo>
            <Campo label="Cidade">
              <input className={inputClasses} value={form.cidade} onChange={(e) => atualizarForm("cidade", e.target.value)} />
            </Campo>
            <Campo label="UF">
              <input className={cx(inputClasses, "uppercase")} maxLength={2} value={form.uf} onChange={(e) => atualizarForm("uf", e.target.value)} />
            </Campo>
            <Campo label="Telefone">
              <input className={inputClasses} value={form.telefone} onChange={(e) => atualizarForm("telefone", e.target.value)} />
            </Campo>
            <Campo label="E-mail">
              <input className={inputClasses} value={form.email} onChange={(e) => atualizarForm("email", e.target.value)} />
            </Campo>
            <Campo label="Site">
              <input className={inputClasses} value={form.site} onChange={(e) => atualizarForm("site", e.target.value)} />
            </Campo>
            <Campo label="Responsável padrão">
              <input className={inputClasses} value={form.responsavelPadrao} onChange={(e) => atualizarForm("responsavelPadrao", e.target.value)} />
            </Campo>
            <Campo label="Cargo padrão" className="md:col-span-2">
              <input className={inputClasses} value={form.cargoPadrao} onChange={(e) => atualizarForm("cargoPadrao", e.target.value)} />
            </Campo>
          </div>
          <div className="flex justify-end">
            <button type="submit" className={botaoClasses("primario")} disabled={salvando === "orgao"}>
              {salvando === "orgao" ? "Salvando..." : "Salvar dados institucionais"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
