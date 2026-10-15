"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, botaoClasses, cx } from "@/components/ui";

type Previa = {
  documentosLocais: number;
  documentosBaseOficial: number;
  setores: number;
  setoresVinculados: number;
  itens: number;
  movimentos: number;
  sincronizacoes: number;
  linhasNumeracao: number;
  contadoresOficiais: number;
  baseOficialConfigurada: boolean;
};

type Relatorio = {
  escopo: string;
  documentosRemovidos: number;
  itensRemovidos: number;
  movimentosRemovidos: number;
  setoresRemovidos: number;
  sincronizacoesRemovidas: number;
  numeracaoAjustada: number;
  contatosInstitucionaisLimpos: boolean;
  duracaoMs: number;
};

function ItemPrevia({ rotulo, valor, tom = "text-slate-800" }: { rotulo: string; valor: number; tom?: string }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 text-xs last:border-0">
      <span className="text-slate-600">{rotulo}</span>
      <span className={cx("tabular-nums font-semibold", tom)}>{valor}</span>
    </li>
  );
}

export function ManutencaoBase() {
  const router = useRouter();
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = () => {
    fetch("/api/admin/manutencao")
      .then((resposta) => resposta.json())
      .then((dados: { previa?: Previa }) => setPrevia(dados.previa ?? null))
      .catch(() => undefined);
  };

  useEffect(carregar, []);

  const executar = async (escopo: "demonstracao" | "total") => {
    const mensagem =
      escopo === "total"
        ? "Isto removerá TODOS os documentos, inclusive os espelhados da base oficial, todas as unidades e zerará a numeração. Continuar?"
        : "Isto removerá os expedientes de demonstração, as unidades sem vínculo e limpará o histórico de sincronizações. Os documentos da base oficial serão mantidos. Continuar?";
    if (!window.confirm(mensagem)) return;

    setProcessando(escopo);
    setErro(null);
    setRelatorio(null);
    try {
      const resposta = await fetch("/api/admin/manutencao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escopo, confirmar: true }),
      });
      const dados = (await resposta.json()) as { ok?: boolean; relatorio?: Relatorio; previa?: Previa; erro?: string };
      if (!resposta.ok || !dados.ok) {
        setErro(dados.erro ?? "Não foi possível concluir a limpeza.");
      } else {
        setRelatorio(dados.relatorio ?? null);
        setPrevia(dados.previa ?? null);
        router.refresh();
      }
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setProcessando(null);
    }
  };

  return (
    <Card
      titulo="Manutenção da base de dados"
      subtitulo="Use antes de entrar em produção: remove a massa de teste e deixa o acervo pronto para os registros reais."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Situação atual</p>
          {!previa ? (
            <p className="mt-2 text-xs text-slate-500">Carregando contagens...</p>
          ) : (
            <ul className="mt-2">
              <ItemPrevia rotulo="Expedientes de demonstração" valor={previa.documentosLocais} tom="text-amber-700" />
              <ItemPrevia rotulo="Documentos espelhados da base oficial" valor={previa.documentosBaseOficial} tom="text-emerald-700" />
              <ItemPrevia rotulo="Unidades/órgãos cadastrados" valor={previa.setores} />
              <ItemPrevia rotulo="Unidades com documentos vinculados" valor={previa.setoresVinculados} />
              <ItemPrevia rotulo="Itens de relação de remessa" valor={previa.itens} />
              <ItemPrevia rotulo="Movimentações registradas" valor={previa.movimentos} />
              <ItemPrevia rotulo="Histórico de sincronizações" valor={previa.sincronizacoes} />
              <ItemPrevia rotulo="Linhas de numeração" valor={previa.linhasNumeracao} />
              <ItemPrevia
                rotulo="Contadores oficiais localizados"
                valor={previa.contadoresOficiais}
                tom={previa.contadoresOficiais > 0 ? "text-emerald-700" : "text-slate-500"}
              />
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Limpeza de demonstração (recomendada)</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Remove os expedientes de teste e as unidades sem vínculo.</li>
              <li>Apaga o histórico de sincronizações de teste.</li>
              <li>Recalcula a numeração: contadores da base oficial como piso e maior sequencial existente.</li>
              <li>Zera os contatos institucionais fictícios (endereço, telefone, e-mail) para você preencher os reais.</li>
              <li>Mantém os documentos espelhados da base oficial.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <p className="font-semibold">Limpeza total (zona de risco)</p>
            <p className="mt-1">
              Remove todos os documentos, inclusive os espelhados da base oficial, todas as unidades e zera a numeração.
              A base oficial no Supabase não é alterada — basta sincronizar novamente para reimportar.
            </p>
          </div>

          {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{erro}</p>}

          {relatorio && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
              <p className="font-semibold">
                Limpeza concluída ({relatorio.escopo === "total" ? "total" : "demonstração"}) em {relatorio.duracaoMs} ms
              </p>
              <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                <li>Documentos removidos: <strong>{relatorio.documentosRemovidos}</strong></li>
                <li>Itens removidos: <strong>{relatorio.itensRemovidos}</strong></li>
                <li>Movimentações removidas: <strong>{relatorio.movimentosRemovidos}</strong></li>
                <li>Unidades removidas: <strong>{relatorio.setoresRemovidos}</strong></li>
                <li>Sincronizações removidas: <strong>{relatorio.sincronizacoesRemovidas}</strong></li>
                <li>Numeração ajustada: <strong>{relatorio.numeracaoAjustada}</strong></li>
              </ul>
              {relatorio.contatosInstitucionaisLimpos && (
                <p className="mt-1">
                  Preencha os <strong>dados institucionais</strong> abaixo com as informações reais antes de emitir
                  documentos.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={botaoClasses("primario")}
              disabled={processando !== null}
              onClick={() => executar("demonstracao")}
            >
              {processando === "demonstracao" ? "Limpando..." : "Limpar dados de demonstração"}
            </button>
            <button
              type="button"
              className={botaoClasses("perigo")}
              disabled={processando !== null}
              onClick={() => executar("total")}
            >
              {processando === "total" ? "Limpando..." : "Limpar tudo (zona de risco)"}
            </button>
            <button type="button" className={botaoClasses("fantasma")} onClick={carregar} disabled={processando !== null}>
              Atualizar contagens
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
