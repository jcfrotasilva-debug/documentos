"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CONFIG_STATUS,
  STATUS_DOCUMENTO,
  STATUS_FLUXO,
  type StatusDocumento,
} from "@/lib/domain";
import { hojeISO } from "@/lib/format";
import { Campo, Card, botaoClasses, cx, inputClasses, selectClasses } from "@/components/ui";

const SUGESTOES: Record<string, string> = {
  RASCUNHO: "Minuta reaberta para ajustes internos",
  EXPEDIDO: "Documento expedido ao destinatário",
  EM_TRANSITO: "Encaminhado ao destino pelo meio de envio definido",
  RECEBIDO: "Recebimento confirmado pelo destinatário",
  ARQUIVADO: "Autuado no arquivo corrente da unidade",
  CANCELADO: "Documento cancelado por determinação superior",
};

export function PainelTramitacao({
  documentoId,
  statusAtual,
  numero,
}: {
  documentoId: number;
  statusAtual: StatusDocumento;
  numero: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusDocumento>(statusAtual);
  const [descricao, setDescricao] = useState(SUGESTOES[statusAtual] ?? "");
  const [usuario, setUsuario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  const registrar = async () => {
    if (descricao.trim().length < 3) {
      setErro("Descreva a movimentação com pelo menos 3 caracteres.");
      return;
    }
    setProcessando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/documentos/${documentoId}/movimentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, descricao, usuario: usuario || undefined }),
      });
      const dados = (await resposta.json()) as { erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível registrar a movimentação.");
      } else {
        router.refresh();
      }
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setProcessando(false);
    }
  };

  const excluir = async () => {
    if (!window.confirm(`Excluir definitivamente o documento ${numero}? Esta ação não pode ser desfeita.`)) return;
    setProcessando(true);
    try {
      const resposta = await fetch(`/api/documentos/${documentoId}`, { method: "DELETE" });
      if (resposta.ok) {
        router.push("/documentos");
        router.refresh();
      } else {
        setErro("Não foi possível excluir o documento.");
      }
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Card
      titulo="Tramitação"
      subtitulo={`Situação atual: ${CONFIG_STATUS[statusAtual].label}`}
      className="no-print"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FLUXO.map((valor, indice) => {
            const alcancado = STATUS_FLUXO.indexOf(statusAtual) >= indice && statusAtual !== "CANCELADO";
            return (
              <span
                key={valor}
                className={cx(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset",
                  alcancado
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-slate-50 text-slate-400 ring-slate-200",
                )}
              >
                {indice + 1}. {CONFIG_STATUS[valor].label}
              </span>
            );
          })}
          {statusAtual === "CANCELADO" && (
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
              Cancelado
            </span>
          )}
        </div>

        <Campo label="Nova situação">
          <select
            className={selectClasses}
            value={status}
            onChange={(evento) => {
              const valor = evento.target.value as StatusDocumento;
              setStatus(valor);
              setDescricao(SUGESTOES[valor] ?? "");
            }}
          >
            {STATUS_DOCUMENTO.map((valor) => (
              <option key={valor} value={valor}>
                {CONFIG_STATUS[valor].label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Histórico / providência">
          <textarea
            className={cx(inputClasses, "min-h-20 resize-y")}
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            placeholder="Descreva o andamento registrado"
          />
        </Campo>

        <Campo label="Responsável pelo registro" dica={`Data do registro: ${hojeISO().split("-").reverse().join("/")}`}>
          <input
            className={inputClasses}
            value={usuario}
            onChange={(evento) => setUsuario(evento.target.value)}
            placeholder="Seu nome"
          />
        </Campo>

        {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{erro}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={botaoClasses("primario")} onClick={registrar} disabled={processando}>
            {processando ? "Registrando..." : "Registrar movimentação"}
          </button>
          <button type="button" className={botaoClasses("perigo")} onClick={excluir} disabled={processando}>
            Excluir documento
          </button>
        </div>
      </div>
    </Card>
  );
}
