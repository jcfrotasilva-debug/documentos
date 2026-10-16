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
import { BrasaoUploader, type BrasaoValores } from "@/components/BrasaoUploader";
import { Campo, Card, botaoClasses, cx, inputClasses } from "@/components/ui";

export type ConfiguracaoValores = {
  orgaoNome: string;
  orgaoUnidade: string;
  orgaoSigla: string;
  orgaoHierarquia: string;
  logoUrl: string;
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
  ano: number;
  prefixo: string;
  digitos: number;
  ultimoNumero: number;
  proximoNumero: string;
  ultimoNoAcervo: number;
  documentos: number;
  proximoJaUsado: boolean;
  chaveLegada: string | null;
};

const chave = (linha: { movimentacao: Movimentacao; tipo: TipoDocumento }) => `${linha.movimentacao}:${linha.tipo}`;

export function ConfiguracoesPainel({
  configuracao,
  numeracao,
  ano,
  anos,
  brasao,
}: {
  configuracao: ConfiguracaoValores;
  numeracao: LinhaNumeracao[];
  ano: number;
  anos: number[];
  brasao: BrasaoValores;
}) {
  const router = useRouter();
  const [form, setForm] = useState(configuracao);
  const [linhas, setLinhas] = useState(numeracao);
  const [anoSel, setAnoSel] = useState(ano);
  /* Valor digitado em "próximo número" por linha (ainda não salvo). */
  const [proximos, setProximos] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const atualizarForm = (campo: keyof ConfiguracaoValores, valor: string) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

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

  const recarregar = (novoAno: number) => {
    fetch(`/api/numeracao?ano=${novoAno}`)
      .then((resposta) => resposta.json())
      .then((dados: { sequencias?: LinhaNumeracao[] }) => {
        if (dados.sequencias) setLinhas(dados.sequencias);
      })
      .catch(() => undefined);
  };

  const definirProximo = async (linha: LinhaNumeracao, confirmarDuplicidade = false) => {
    const bruto = proximos[chave(linha)];
    const valor = Number(String(bruto ?? "").replace(/\D/g, ""));
    setErro(null);
    setMensagem(null);
    if (!Number.isInteger(valor) || valor < 1) {
      setErro("Informe um número inteiro maior que zero.");
      return;
    }
    setSalvando(`definir:${chave(linha)}`);
    try {
      const resposta = await fetch("/api/numeracao/ajustar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movimentacao: linha.movimentacao,
          tipo: linha.tipo,
          ano: anoSel,
          proximo: valor,
          confirmarDuplicidade,
        }),
      });
      const dados = (await resposta.json()) as {
        ok?: boolean;
        erro?: string;
        aviso?: string;
        mensagem?: string;
        linha?: LinhaNumeracao;
      };
      if (!resposta.ok || !dados.ok) {
        if (resposta.status === 409) {
          if (window.confirm(`${dados.erro ?? "Número já usado no acervo."}\n\nDeseja definir mesmo assim?`)) {
            await definirProximo(linha, true);
            return;
          }
          setErro(dados.erro ?? "Número já consta no acervo.");
        } else {
          setErro(dados.erro ?? "Não foi possível ajustar a sequência.");
        }
        return;
      }
      setMensagem(dados.mensagem ?? "Sequência ajustada.");
      if (dados.aviso) setErro(dados.aviso);
      setProximos((atual) => ({ ...atual, [chave(linha)]: "" }));
      recarregar(anoSel);
      router.refresh();
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setSalvando(null);
    }
  };

  const recalcularTudo = async () => {
    if (
      !window.confirm(
        "Igualar todas as sequências ao maior número já lançado no acervo deste exercício? Use quando o acervo estiver completo.",
      )
    )
      return;
    setErro(null);
    setMensagem(null);
    setSalvando("recalcular");
    try {
      const resposta = await fetch("/api/numeracao/ajustar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "recalcular", ano: anoSel }),
      });
      const dados = (await resposta.json()) as { ok?: boolean; erro?: string; mensagem?: string };
      if (!resposta.ok || !dados.ok) setErro(dados.erro ?? "Não foi possível recalcular.");
      else {
        setMensagem(dados.mensagem ?? "Sequências recalculadas.");
        recarregar(anoSel);
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
    setProximos({});
    recarregar(novoAno);
  };

  return (
    <div className="space-y-5">
      {mensagem && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</p>
      )}
      {erro && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}

      <Card
        titulo="Sequência de numeração — definir o próximo número"
        subtitulo="Digite o PRÓXIMO número que deve ser emitido. O sistema grava um a menos como último emitido (ex.: 80 → próxima emissão OF-00080/2026)."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              className={cx(botaoClasses("secundario"), "px-3 py-2 text-xs")}
              onClick={recalcularTudo}
              disabled={salvando !== null}
              title="Iguala cada sequência ao maior número já lançado no acervo"
            >
              {salvando === "recalcular" ? "Recalculando..." : "Igualar ao acervo"}
            </button>
          </div>
        }
        espacamento="p-0"
      >
        <div className="overflow-x-auto scroll-fino">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2 font-semibold">Movimentação</th>
                <th className="px-3 py-2 font-semibold">Espécie</th>
                <th className="px-3 py-2 font-semibold">Último emitido</th>
                <th className="px-3 py-2 font-semibold">Maior no acervo</th>
                <th className="px-3 py-2 font-semibold">Definir próximo nº</th>
                <th className="px-3 py-2 font-semibold">Resultado</th>
                <th className="px-5 py-2 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOVIMENTACOES.flatMap((movimentacao) =>
                TIPOS_DOCUMENTO.map((tipo) => {
                  const linha = linhas.find((item) => item.movimentacao === movimentacao && item.tipo === tipo);
                  if (!linha) return null;
                  const valorDigitado = proximos[chave(linha)] ?? "";
                  const previa = valorDigitado
                    ? montarNumero(linha.prefixo || prefixoPadrao(movimentacao, tipo), Number(valorDigitado) || 0, linha.digitos, anoSel)
                    : linha.proximoNumero;
                  const divergente = linha.ultimoNoAcervo > linha.ultimoNumero;
                  return (
                    <tr key={chave(linha)} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                            CONFIG_MOVIMENTACAO[movimentacao].chip,
                          )}
                        >
                          {CONFIG_MOVIMENTACAO[movimentacao].seta} {CONFIG_MOVIMENTACAO[movimentacao].label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">{CONFIG_TIPO[tipo].label}</p>
                        <p className="text-[11px] text-slate-500">
                          {linha.documentos} documento(s){linha.chaveLegada ? ` · contador: ${linha.chaveLegada}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">
                        {linha.ultimoNumero > 0 ? linha.ultimoNumero : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        <span className={divergente ? "font-semibold text-amber-700" : "text-slate-700"}>
                          {linha.ultimoNoAcervo > 0 ? linha.ultimoNoAcervo : "—"}
                        </span>
                        {divergente && (
                          <span className="block text-[10px] text-amber-700">acervo à frente da sequência</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={1}
                          inputMode="numeric"
                          placeholder={String(linha.ultimoNumero + 1)}
                          className={cx(inputClasses, "w-28 py-1 tabular-nums")}
                          value={valorDigitado}
                          onChange={(evento) =>
                            setProximos((atual) => ({ ...atual, [chave(linha)]: evento.target.value }))
                          }
                          onKeyDown={(evento) => {
                            if (evento.key === "Enter") {
                              evento.preventDefault();
                              void definirProximo(linha);
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs font-semibold text-brand-700">{previa}</span>
                        {linha.proximoJaUsado && (
                          <span className="block text-[10px] font-semibold text-rose-600">já usado no acervo</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          className={cx(botaoClasses("secundario"), "px-2 py-1 text-xs")}
                          disabled={salvando === `definir:${chave(linha)}`}
                          onClick={() => definirProximo(linha)}
                        >
                          {salvando === `definir:${chave(linha)}` ? "Salvando..." : "Definir"}
                        </button>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-1 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          <p>
            <strong>Último emitido</strong> é o valor que o sistema usa para gerar o próximo número.{" "}
            <strong>Maior no acervo</strong> é o maior número já lançado nos documentos — se ele estiver à frente, clique
            em &ldquo;Igualar ao acervo&rdquo;.
          </p>
          <p>
            Ao definir um número que já existe no acervo, o sistema avisa e pede confirmação — útil para reemitir um
            documento cancelado.
          </p>
          <p>
            Prefixo e quantidade de dígitos por espécie são ajustáveis na API (<code>/api/numeracao</code>, campos
            <code> prefixo</code> e <code>digitos</code>).
          </p>
        </div>
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
            <Campo label="Unidade emissora" className="md:col-span-3" dica="Aparece abaixo do nome da escola. Pode ficar em branco.">
              <input className={inputClasses} value={form.orgaoUnidade} onChange={(e) => atualizarForm("orgaoUnidade", e.target.value)} />
            </Campo>
            <Campo
              label="Hierarquia do timbre"
              className="md:col-span-3"
              dica="Uma linha por nível, separadas por | . Ex.: GOVERNO DO ESTADO DE SÃO PAULO|SECRETARIA DE ESTADO DA EDUCAÇÃO"
            >
              <input
                className={inputClasses}
                value={form.orgaoHierarquia}
                onChange={(e) => atualizarForm("orgaoHierarquia", e.target.value)}
                placeholder="GOVERNO DO ESTADO DE SÃO PAULO|SECRETARIA DE ESTADO DA EDUCAÇÃO"
              />
            </Campo>
            <BrasaoUploader
              brasao={brasao}
              urlAtual={form.logoUrl}
              aoAlterarUrl={(valor) => atualizarForm("logoUrl", valor)}
            />
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
