"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { botaoClasses } from "@/components/ui";

export function SeedButton({ compacto = false }: { compacto?: boolean }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setMensagem(null);
    try {
      const resposta = await fetch("/api/seed", { method: "POST" });
      const dados = (await resposta.json()) as {
        ok?: boolean;
        criados?: number;
        mensagem?: string;
        erro?: string;
        demoDesabilitado?: boolean;
      };
      if (!resposta.ok) {
        setMensagem(dados.erro ?? "Falha ao carregar dados.");
      } else {
        setMensagem(dados.mensagem ?? `${dados.criados ?? 0} documento(s) de demonstração criados.`);
        router.refresh();
      }
    } catch {
      setMensagem("Falha de comunicação com o servidor.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={carregar} className={botaoClasses("secundario")} disabled={carregando}>
        {carregando ? "Carregando..." : "Carregar dados de demonstração"}
      </button>
      {mensagem && !compacto && <span className="text-xs text-slate-500">{mensagem}</span>}
    </div>
  );
}
