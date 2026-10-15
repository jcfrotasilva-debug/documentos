"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, botaoClasses, cx } from "@/components/ui";

type Relatorio = {
  analisados?: number;
  importados?: number;
  atualizados?: number;
  ignorados?: number;
  contadoresSincronizados?: number;
  duracaoMs?: number;
  erros?: string[];
  erro?: string;
};

export function ImportadorSupabase({ configurada, pendentes }: { configurada: boolean; pendentes: number }) {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const importar = async (aplicar: boolean) => {
    if (aplicar && !window.confirm("Reler a base oficial e gravar/atualizar os registros no sistema?")) return;
    setProcessando(true);
    setErro(null);
    setRelatorio(null);
    try {
      const resposta = await fetch("/api/supabase/importar", { method: "POST" });
      const dados = (await resposta.json()) as Relatorio;
      if (!resposta.ok) {
        setErro(dados.erro ?? "Falha na sincronização.");
      } else {
        setRelatorio(dados);
        router.refresh();
      }
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Card
      titulo="Sincronização com a base oficial"
      subtitulo="Lê as tabelas documentos e contadores no Supabase, converte o formato legado e atualiza o acervo local sem duplicar registros."
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={botaoClasses("primario")}
          disabled={!configurada || processando}
          onClick={() => importar(true)}
        >
          {processando ? "Sincronizando..." : pendentes > 0 ? `Importar ${pendentes} registro(s)` : "Ressincronizar base"}
        </button>
        <span className="text-xs text-slate-500">
          {configurada
            ? "A releitura é idempotente: registros já importados são atualizados pelo id de origem."
            : "Integração desativada: defina SUPABASE_URL e SUPABASE_ANON_KEY no .env."}
        </span>
      </div>

      {erro && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{erro}</p>}

      {relatorio && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
          <p className="font-semibold">Sincronização concluída em {relatorio.duracaoMs ?? 0} ms</p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            <li>Linhas analisadas: <strong>{relatorio.analisados ?? 0}</strong></li>
            <li>Novos documentos: <strong>{relatorio.importados ?? 0}</strong></li>
            <li>Atualizados: <strong>{relatorio.atualizados ?? 0}</strong></li>
            <li>Contadores sincronizados: <strong>{relatorio.contadoresSincronizados ?? 0}</strong></li>
            <li>Ignorados: <strong>{relatorio.ignorados ?? 0}</strong></li>
          </ul>
          {relatorio.erros && relatorio.erros.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold">Ocorrências ({relatorio.erros.length})</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px]">
                {relatorio.erros.slice(0, 12).map((item, indice) => (
                  <li key={indice}>{item}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <p className={cx("mt-3 text-[11px] text-slate-500", !configurada && "text-amber-600")}>
        Nenhuma escrita é feita no Supabase: a integração opera somente leitura sobre a base oficial.
      </p>
    </Card>
  );
}
