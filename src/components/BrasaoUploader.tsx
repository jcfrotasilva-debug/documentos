"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Campo, botaoClasses, cx, inputClasses } from "@/components/ui";

export type BrasaoValores = {
  /** Endereço efetivo usado no timbre (banco, arquivo em /public ou URL). */
  src: string | null;
  origem: "banco" | "arquivo-publico" | "url" | "monograma";
  nomeArquivo: string | null;
  urlExterna: string;
};

const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/gif"];
const LIMITE_BYTES = 1_000_000; /* ~1 MB — suficiente para brasão em alta resolução */

export function BrasaoUploader({
  brasao,
  aoAlterarUrl,
  urlAtual,
}: {
  brasao: BrasaoValores;
  aoAlterarUrl: (valor: string) => void;
  urlAtual: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [versao, setVersao] = useState(0);

  const imagem = previa ?? (brasao.src ? `${brasao.src}${brasao.src.includes("?") ? "&" : "?"}r=${versao}` : null);

  const enviar = async (arquivo: File) => {
    setErro(null);
    setMensagem(null);

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro("Formato não suportado. Envie PNG, JPG, SVG ou WEBP.");
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      setErro(`Imagem muito grande (${Math.round(arquivo.size / 1024)} KB). Use um arquivo de até 1 MB.`);
      return;
    }

    setOcupado(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result));
        leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
        leitor.readAsDataURL(arquivo);
      });

      setPrevia(dataUrl);

      const resposta = await fetch("/api/configuracoes/brasao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arquivo: dataUrl, nomeArquivo: arquivo.name }),
      });
      const dados = (await resposta.json()) as { ok?: boolean; erro?: string; mensagem?: string };

      if (!resposta.ok || !dados.ok) {
        setErro(dados.erro ?? "Não foi possível salvar o brasão.");
        setPrevia(null);
        return;
      }

      setMensagem(dados.mensagem ?? "Brasão salvo.");
      setVersao((valor) => valor + 1);
      router.refresh();
    } catch {
      setErro("Falha ao ler o arquivo. Tente novamente.");
      setPrevia(null);
    } finally {
      setOcupado(false);
    }
  };

  const remover = async () => {
    if (!window.confirm("Remover a imagem enviada? O timbre volta ao arquivo público/URL configurada.")) return;
    setOcupado(true);
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await fetch("/api/configuracoes/brasao", { method: "DELETE" });
      const dados = (await resposta.json()) as { ok?: boolean; erro?: string; mensagem?: string };
      if (!resposta.ok || !dados.ok) {
        setErro(dados.erro ?? "Não foi possível remover.");
        return;
      }
      setPrevia(null);
      setVersao((valor) => valor + 1);
      setMensagem(dados.mensagem ?? "Brasão removido.");
      router.refresh();
    } finally {
      setOcupado(false);
    }
  };

  const rotuloOrigem: Record<BrasaoValores["origem"], string> = {
    banco: "imagem enviada (guardada no banco)",
    "arquivo-publico": "arquivo do projeto (pasta public)",
    url: "URL externa",
    monograma: "monograma com a sigla (nenhuma imagem)",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 md:col-span-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Brasão / logotipo do timbre</p>
      <p className="mt-1 text-[11px] text-slate-500">
        A imagem é impressa no canto superior esquerdo dos documentos. Ordem de prioridade: imagem enviada → arquivo do
        projeto → URL → monograma.
      </p>

      <div className="mt-3 grid gap-4 md:grid-cols-[150px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt="Pré-visualização do brasão" className="h-28 w-auto object-contain" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-800 text-[11px] font-bold uppercase text-slate-800">
              {(urlAtual ? "URL" : "SEM IMAGEM").slice(0, 10)}
            </span>
          )}
          <p className="mt-2 text-center text-[10px] text-slate-500">{rotuloOrigem[brasao.origem]}</p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={TIPOS_ACEITOS.join(",")}
              className="hidden"
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0];
                if (arquivo) void enviar(arquivo);
                evento.target.value = "";
              }}
            />
            <button
              type="button"
              className={botaoClasses("primario")}
              disabled={ocupado}
              onClick={() => inputRef.current?.click()}
            >
              {ocupado ? "Processando..." : "📎 Enviar imagem do brasão"}
            </button>
            <button
              type="button"
              className={botaoClasses("secundario")}
              disabled={ocupado}
              onClick={() => inputRef.current?.click()}
              title="Selecionar outro arquivo substitui o atual"
            >
              Substituir
            </button>
            {brasao.origem === "banco" && (
              <button type="button" className={botaoClasses("perigo")} disabled={ocupado} onClick={remover}>
                Remover imagem
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Formatos aceitos: <strong>PNG, JPG, SVG, WEBP</strong> · até <strong>1 MB</strong>. O arquivo fica guardado
            no banco de dados (ambientes serverless não permitem gravar em disco).
          </p>

          <Campo
            label="Ou informe um caminho/URL"
            dica="Arquivo do projeto (ex.: /brasao-sp.svg) ou endereço completo (https://...). Usado quando não há imagem enviada."
          >
            <input
              className={inputClasses}
              value={urlAtual}
              onChange={(evento) => aoAlterarUrl(evento.target.value)}
              placeholder="/brasao-sp.svg"
            />
          </Campo>

          {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{erro}</p>}
          {mensagem && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{mensagem}</p>}

          <p className={cx("text-[11px]", brasao.origem === "monograma" ? "text-amber-700" : "text-slate-500")}>
            {brasao.origem === "monograma"
              ? "Sem imagem configurada: será impresso um monograma com a sigla da unidade. O projeto já inclui o brasão oficial em /brasao-sp.svg — basta informá-lo no campo acima."
              : "Confira a pré-visualização: é exatamente assim que o brasão aparecerá na impressão."}
          </p>
        </div>
      </div>
    </div>
  );
}
