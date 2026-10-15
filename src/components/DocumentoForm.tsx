"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CONFIG_MEIO,
  CONFIG_MOVIMENTACAO,
  CONFIG_PRIORIDADE,
  CONFIG_SIGILO,
  CONFIG_STATUS,
  CONFIG_TIPO,
  GRAUS_SIGILO,
  MEIOS_ENVIO,
  MOVIMENTACOES,
  PRIORIDADES,
  STATUS_DOCUMENTO,
  TIPOS_DOCUMENTO,
  prefixoPadrao,
  type GrauSigilo,
  type MeioEnvio,
  type Movimentacao,
  type Prioridade,
  type StatusDocumento,
  type TipoDocumento,
} from "@/lib/domain";
import { formatarMoeda, montarNumero } from "@/lib/format";
import { itemVazio, type DocumentoFormValores, type ItemForm } from "@/lib/documento-form";
import { Campo, Card, botaoClasses, cx, inputClasses, selectClasses } from "@/components/ui";

export type { DocumentoFormValores, ItemForm };

type Previsao = {
  movimentacao: Movimentacao;
  tipo: TipoDocumento;
  numero: string;
  sequencial: number;
};

export function DocumentoForm({
  modo,
  valores,
  anos,
  anoAtual,
}: {
  modo: "novo" | "editar";
  valores: DocumentoFormValores;
  anos: number[];
  anoAtual: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<DocumentoFormValores>(valores);
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [numeroManual, setNumeroManual] = useState<string>(modo === "editar" ? valores.numero : "");
  const [usarManual, setUsarManual] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const ano = Number(form.dataDocumento.slice(0, 4)) || anoAtual;

  const atualizar = useCallback(
    <C extends keyof DocumentoFormValores>(campo: C, valor: DocumentoFormValores[C]) => {
      setForm((atual) => ({ ...atual, [campo]: valor }));
    },
    [],
  );

  useEffect(() => {
    let ativo = true;
    fetch(`/api/documentos/proximo-numero?ano=${ano}`)
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: { numeros?: Previsao[] } | null) => {
        if (ativo && dados?.numeros) setPrevisoes(dados.numeros);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [ano]);

  const previsaoAtual = useMemo(
    () => previsoes.find((item) => item.tipo === form.tipo && item.movimentacao === form.movimentacao),
    [previsoes, form.tipo, form.movimentacao],
  );

  const numeroExibido =
    modo === "editar" && !usarManual
      ? form.numero || previsaoAtual?.numero || "—"
      : usarManual
        ? numeroManual || "informe o número"
        : previsaoAtual?.numero ?? montarNumero(prefixoPadrao(form.movimentacao, form.tipo), 1, 5, ano);

  const ehRemessa = form.tipo === "RELACAO_REMESSA";
  const ehRecebimento = form.movimentacao === "RECEBIMENTO";
  const totais = useMemo(() => {
    const quantidade = form.itens.reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0);
    const valor = form.itens.reduce((soma, item) => {
      const numero = Number(String(item.valor).replace(",", "."));
      return soma + (Number.isFinite(numero) ? numero : 0);
    }, 0);
    return { quantidade, valor };
  }, [form.itens]);

  const setItem = (indice: number, campo: keyof ItemForm, valor: string | number) => {
    setForm((atual) => {
      const itens = [...atual.itens];
      itens[indice] = { ...itens[indice], [campo]: valor } as ItemForm;
      return { ...atual, itens };
    });
  };

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!form.assunto.trim()) return setErro("Informe o assunto do documento.");
    if (!form.interessado.trim()) return setErro("Informe o interessado do expediente.");
    if (!form.responsavel.trim()) return setErro("Informe o responsável pelo registro.");

    setSalvando(true);
    const payload = {
      ...form,
      ano,
      numeroManual: usarManual && numeroManual.trim() ? numeroManual.trim() : null,
      itens: form.itens
        .filter((item) => item.descricao.trim())
        .map((item) => ({ ...item, valor: item.valor === "" ? null : item.valor })),
    };

    try {
      const resposta = await fetch(modo === "novo" ? "/api/documentos" : `/api/documentos/${form.id}`, {
        method: modo === "novo" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dados = (await resposta.json()) as { erro?: string; id?: number };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar o documento.");
        setSalvando(false);
        return;
      }
      router.push(`/documentos/${dados.id ?? form.id}?salvo=1`);
      router.refresh();
    } catch {
      setErro("Falha de comunicação com o servidor.");
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      {erro && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>
      )}

      <Card
        titulo="Identificação do documento"
        subtitulo="O número é gerado automaticamente por movimentação, espécie e exercício (igual aos contadores da base oficial). As datas podem ser editadas."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Campo label="Movimentação" obrigatorio dica="Reinicia a sequência de numeração.">
            <select
              className={selectClasses}
              value={form.movimentacao}
              onChange={(evento) => {
                atualizar("movimentacao", evento.target.value as Movimentacao);
                setUsarManual(false);
              }}
            >
              {MOVIMENTACOES.map((valor) => (
                <option key={valor} value={valor}>
                  {CONFIG_MOVIMENTACAO[valor].label}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Tipo de documento" obrigatorio>
            <select
              className={selectClasses}
              value={form.tipo}
              onChange={(evento) => {
                atualizar("tipo", evento.target.value as TipoDocumento);
                setUsarManual(false);
              }}
            >
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {CONFIG_TIPO[tipo].label}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            label="Número (automático)"
            dica={`Sequência prevista: ${previsaoAtual?.sequencial ?? 1} · prefixo ${prefixoPadrao(form.movimentacao, form.tipo)}`}
          >
            <div className="flex items-center gap-2">
              <input
                className={cx(inputClasses, "font-mono font-semibold text-brand-700")}
                value={numeroExibido}
                readOnly={!usarManual}
                onChange={(evento) => setNumeroManual(evento.target.value)}
              />
              <button
                type="button"
                className={cx(botaoClasses("secundario"), "shrink-0 px-2 py-2 text-xs")}
                onClick={() => setUsarManual((valor) => !valor)}
                title="Registros antigos podem exigir número informado manualmente"
              >
                {usarManual ? "Auto" : "Manual"}
              </button>
            </div>
          </Campo>

          <Campo label="Ano de exercício" dica="Definido pela data do documento">
            <input className={cx(inputClasses, "bg-slate-50")} value={ano} readOnly />
          </Campo>

          <Campo label="Data do documento" obrigatorio>
            <input
              type="date"
              className={inputClasses}
              value={form.dataDocumento}
              onChange={(evento) => atualizar("dataDocumento", evento.target.value)}
              required
            />
          </Campo>
          <Campo label={ehRecebimento ? "Data de recebimento" : "Data de expedição"}>
            <input
              type="date"
              className={inputClasses}
              value={form.dataExpedicao}
              onChange={(evento) => atualizar("dataExpedicao", evento.target.value)}
            />
          </Campo>
          <Campo label="Prazo para resposta">
            <input
              type="date"
              className={inputClasses}
              value={form.prazoResposta}
              onChange={(evento) => atualizar("prazoResposta", evento.target.value)}
            />
          </Campo>
          <Campo label="Exercícios disponíveis">
            <select
              className={selectClasses}
              value={String(ano)}
              onChange={(evento) =>
                atualizar("dataDocumento", `${evento.target.value}${form.dataDocumento.slice(4)}`)
              }
            >
              {Array.from(new Set([ano, ...anos]))
                .sort((a, b) => b - a)
                .map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
            </select>
          </Campo>
        </div>
      </Card>

      <Card titulo="Conteúdo, interessado e processo">
        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Assunto" obrigatorio className="md:col-span-2">
            <input
              className={inputClasses}
              value={form.assunto}
              onChange={(evento) => atualizar("assunto", evento.target.value)}
              placeholder="Ex.: Remessa de folhas de frequência e requerimentos do mês"
              maxLength={240}
              required
            />
          </Campo>
          <Campo
            label="Interessado"
            obrigatorio
            dica="Servidor, estudante, responsável ou órgão a quem o expediente se refere."
          >
            <input
              className={inputClasses}
              value={form.interessado}
              onChange={(evento) => atualizar("interessado", evento.target.value)}
              placeholder="Ex.: MARIA APARECIDA DA SILVA"
            />
          </Campo>
          <Campo label="Nº do processo" dica="Formato 015.00760145/2026-32">
            <input
              className={inputClasses}
              value={form.numeroProcesso}
              onChange={(evento) => atualizar("numeroProcesso", evento.target.value)}
            />
          </Campo>
          <Campo label="Conteúdo / corpo do documento" className="md:col-span-2" dica="Texto impresso no documento oficial.">
            <textarea
              className={cx(inputClasses, "min-h-28 resize-y leading-relaxed")}
              value={form.conteudo}
              onChange={(evento) => atualizar("conteudo", evento.target.value)}
              placeholder="Descreva o teor do expediente..."
            />
          </Campo>
        </div>
      </Card>

      <Card titulo="Tramitação, classificação e envio">
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Responsável pelo registro" obrigatorio>
            <input
              className={inputClasses}
              value={form.responsavel}
              onChange={(evento) => atualizar("responsavel", evento.target.value)}
              required
            />
          </Campo>
          <Campo label="Cargo do responsável">
            <input
              className={inputClasses}
              value={form.cargoResponsavel}
              onChange={(evento) => atualizar("cargoResponsavel", evento.target.value)}
            />
          </Campo>
          <Campo label="Meio de envio / remessa">
            <select
              className={selectClasses}
              value={form.meioEnvio}
              onChange={(evento) => atualizar("meioEnvio", evento.target.value as MeioEnvio)}
            >
              {MEIOS_ENVIO.map((meio) => (
                <option key={meio} value={meio}>
                  {CONFIG_MEIO[meio]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Prioridade">
            <select
              className={selectClasses}
              value={form.prioridade}
              onChange={(evento) => atualizar("prioridade", evento.target.value as Prioridade)}
            >
              {PRIORIDADES.map((valor) => (
                <option key={valor} value={valor}>
                  {CONFIG_PRIORIDADE[valor].label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Grau de sigilo">
            <select
              className={selectClasses}
              value={form.grauSigilo}
              onChange={(evento) => atualizar("grauSigilo", evento.target.value as GrauSigilo)}
            >
              {GRAUS_SIGILO.map((valor) => (
                <option key={valor} value={valor}>
                  {CONFIG_SIGILO[valor].label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Situação">
            <select
              className={selectClasses}
              value={form.status}
              onChange={(evento) => atualizar("status", evento.target.value as StatusDocumento)}
            >
              {STATUS_DOCUMENTO.map((valor) => (
                <option key={valor} value={valor}>
                  {CONFIG_STATUS[valor].label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Referência externa">
            <input
              className={inputClasses}
              value={form.referenciaExterna}
              onChange={(evento) => atualizar("referenciaExterna", evento.target.value)}
            />
          </Campo>
          <Campo label="Páginas">
            <input
              type="number"
              min={1}
              className={inputClasses}
              value={form.qtdPaginas}
              onChange={(evento) => atualizar("qtdPaginas", Number(evento.target.value))}
            />
          </Campo>
          <Campo label="Anexos / volumes">
            <input
              type="number"
              min={0}
              className={inputClasses}
              value={form.qtdAnexos}
              onChange={(evento) => atualizar("qtdAnexos", Number(evento.target.value))}
            />
          </Campo>
          <Campo label="Observações internas" className="md:col-span-3">
            <textarea
              className={cx(inputClasses, "min-h-20 resize-y")}
              value={form.observacoes}
              onChange={(evento) => atualizar("observacoes", evento.target.value)}
            />
          </Campo>
        </div>
      </Card>

      <Card
        titulo={ehRemessa ? "Relação de Remessa — documentos remetidos" : "Documentos / volumes relacionados"}
        subtitulo={
          ehRemessa
            ? "Discrimine cada documento encaminhado. Os itens são impressos na relação oficial."
            : "Opcional: vincule processos, anexos ou volumes relacionados."
        }
        acoes={
          <button
            type="button"
            className={botaoClasses("secundario")}
            onClick={() => setForm((atual) => ({ ...atual, itens: [...atual.itens, { ...itemVazio }] }))}
          >
            + Adicionar item
          </button>
        }
      >
        {form.itens.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
            Nenhum item relacionado. Use &ldquo;Adicionar item&rdquo; para compor a relação.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="hidden gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[28px_1fr_200px_90px_130px_120px_36px]">
              <span>#</span>
              <span>Descrição</span>
              <span>Referência</span>
              <span>Qtd.</span>
              <span>Valor (R$)</span>
              <span>Observação</span>
              <span />
            </div>
            {form.itens.map((item, indice) => (
              <div
                key={`item-${indice}`}
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/40 p-3 md:grid-cols-[28px_1fr_200px_90px_130px_120px_36px] md:items-center md:border-0 md:bg-transparent md:p-0"
              >
                <span className="text-xs font-semibold text-slate-500">{indice + 1}</span>
                <input
                  className={inputClasses}
                  placeholder="Descrição do documento"
                  value={item.descricao}
                  onChange={(evento) => setItem(indice, "descricao", evento.target.value)}
                />
                <input
                  className={inputClasses}
                  placeholder="Nº de referência"
                  value={item.numeroReferencia}
                  onChange={(evento) => setItem(indice, "numeroReferencia", evento.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  className={inputClasses}
                  value={item.quantidade}
                  onChange={(evento) => setItem(indice, "quantidade", Number(evento.target.value))}
                />
                <input
                  className={cx(inputClasses, "tabular-nums")}
                  placeholder="0,00"
                  value={item.valor}
                  onChange={(evento) => setItem(indice, "valor", evento.target.value)}
                />
                <input
                  className={inputClasses}
                  placeholder="Observação"
                  value={item.observacao}
                  onChange={(evento) => setItem(indice, "observacao", evento.target.value)}
                />
                <button
                  type="button"
                  title="Remover item"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() =>
                    setForm((atual) => ({
                      ...atual,
                      itens: atual.itens.filter((_, posicao) => posicao !== indice),
                    }))
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex justify-end gap-6 rounded-lg bg-slate-50 px-4 py-2 text-xs text-slate-600">
              <span>
                Itens: <strong className="text-slate-800">{form.itens.length}</strong>
              </span>
              <span>
                Quantidade total: <strong className="text-slate-800">{totais.quantidade}</strong>
              </span>
              <span>
                Valor total: <strong className="text-slate-800">{formatarMoeda(totais.valor)}</strong>
              </span>
            </div>
          </div>
        )}
      </Card>

      <div className="no-print sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur">
        <p className="text-xs text-slate-500">
          {modo === "novo"
            ? `Ao salvar, o documento receberá a numeração ${numeroExibido} automaticamente.`
            : `Editando o documento ${form.numero}.`}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className={botaoClasses("secundario")} onClick={() => router.back()}>
            Cancelar
          </button>
          <button type="submit" className={botaoClasses("primario")} disabled={salvando}>
            {salvando ? "Salvando..." : modo === "novo" ? "Cadastrar documento" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </form>
  );
}
