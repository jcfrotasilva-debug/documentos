import type { Configuracao } from "@/db/schema";
import { linhaEndereco } from "@/lib/format";
import { resolverBrasao } from "@/lib/services/documentos";

/**
 * Timbre institucional usado na impressão (Ofício e Relação de Remessa).
 * A imagem vem, nesta ordem: banco (upload) → arquivo em /public → URL externa → monograma.
 */
export function Timbre({
  config,
  compacto = false,
  className = "",
}: {
  config: Configuracao | undefined | null;
  compacto?: boolean;
  className?: string;
}) {
  const brasao = resolverBrasao(config ?? null);
  const hierarquia = (config?.orgaoHierarquia ?? "")
    .split("|")
    .map((linha) => linha.trim())
    .filter(Boolean);

  const endereco = linhaEndereco(
    config?.endereco ?? "",
    config?.cidade ?? "",
    config?.uf ?? "",
    config?.cep ?? "",
    config?.telefone ?? "",
  );

  return (
    <header className={`flex items-center gap-3 border-b border-slate-900 pb-1.5 ${className}`}>
      {brasao.temImagem && brasao.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brasao.src}
          alt="Brasão do Estado de São Paulo"
          className={compacto ? "h-14 w-auto shrink-0" : "h-[70px] w-auto shrink-0"}
        />
      ) : (
        <span
          className={`flex shrink-0 items-center justify-center rounded-full border border-slate-900 font-bold uppercase leading-tight text-slate-900 ${
            compacto ? "h-14 w-14 text-[8px]" : "h-[70px] w-[70px] text-[9px]"
          }`}
        >
          {(config?.orgaoSigla ?? "EEPMF").slice(0, 8)}
        </span>
      )}

      <div className="flex-1 text-center leading-snug">
        {hierarquia.map((linha, indice) => (
          <p
            key={linha}
            className={
              indice === 0
                ? "text-[13px] font-bold uppercase text-slate-900"
                : "text-[12px] font-semibold uppercase text-slate-900"
            }
          >
            {linha}
          </p>
        ))}
        <p className={`${compacto ? "text-[11.5px]" : "text-[12.5px]"} font-bold uppercase text-slate-900`}>
          {config?.orgaoNome || "Unidade escolar"}
        </p>
        {config?.orgaoUnidade && (
          <p className="text-[10.5px] font-semibold uppercase text-slate-800">{config.orgaoUnidade}</p>
        )}
        {endereco && <p className="text-[9.5px] text-slate-800">{endereco}</p>}
        {[config?.email, config?.site].filter(Boolean).length > 0 && (
          <p className="text-[9.5px] text-slate-700">
            {[config?.email, config?.site].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Espaçador para manter o texto centralizado em relação à página */}
      <span className={`shrink-0 ${compacto ? "w-14" : "w-[70px]"}`} aria-hidden />
    </header>
  );
}
