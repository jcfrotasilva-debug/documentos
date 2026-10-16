import type { DocumentoListado } from "@/lib/services/documentos";
import type { DocumentoItem, Configuracao } from "@/db/schema";
import { formatarData, numeroRelacao } from "@/lib/format";
import { Timbre } from "@/components/impressao/Timbre";

export type ViaRelacao = "EXPEDIDOR" | "RECEBEDOR";

const SITUACOES = ["Recebido", "Recebido com Ressalva", "Recusado", "Devolvido"];

function Via({
  documento,
  itens,
  config,
  numero,
  via,
  compacta = false,
}: {
  documento: DocumentoListado;
  itens: DocumentoItem[];
  config: Configuracao | undefined;
  numero: string;
  via: ViaRelacao;
  compacta?: boolean;
}) {
  /* Garante linhas em branco para preenchimento manual, como no modelo oficial. */
  const linhas = compacta ? Math.max(itens.length, 5) : Math.max(itens.length, 8);
  const remetente = config?.orgaoNome ?? documento.origemNome ?? "—";
  const destinatario =
    documento.destinatarioNome || documento.interessado || documento.destinoNome || "";

  return (
    <section className="break-inside-avoid">
      <div className="flex items-end justify-between">
        <div className="flex-1" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {via === "EXPEDIDOR" ? "1ª via — expedidor" : "2ª via — recebedor"}
        </p>
      </div>

      <Timbre config={config} compacto={compacta} />

      <h1 className="mt-1 text-center text-[13px] font-bold uppercase tracking-wide text-slate-900">
        Relação de Remessa
      </h1>

      <p className="mt-0.5 text-right text-[11px] font-semibold text-slate-900">
        Relação de Remessa <span className="ml-2 inline-block min-w-[90px] border-b border-slate-900 text-center">{numero}</span>
      </p>

      <div className="mt-1.5 space-y-0.5 text-[10.5px] text-slate-900">
        <p className="flex gap-2">
          <span className="w-40 font-bold">Remetente:</span>
          <span className="flex-1 border-b border-slate-400 pb-px font-semibold">{remetente}</span>
        </p>
        <p className="flex gap-2">
          <span className="w-40 font-bold">Destinatário:</span>
          <span className="flex-1 border-b border-slate-400 pb-px font-semibold">{destinatario}</span>
        </p>
        <p className="flex gap-2">
          <span className="w-40 font-bold">Endereço destinatário:</span>
          <span className="flex-1 border-b border-slate-400 pb-px">&nbsp;</span>
        </p>
      </div>

      <table className="mt-2 w-full border-collapse text-[9.5px] text-slate-900">
        <thead>
          <tr>
            <th rowSpan={2} className="w-[42px] border border-slate-900 px-1 py-0.5 text-center font-bold">
              Nº item
            </th>
            <th rowSpan={2} className="border border-slate-900 px-1 py-0.5 text-center font-bold">
              Documento
            </th>
            <th rowSpan={2} className="w-[58px] border border-slate-900 px-1 py-0.5 text-center font-bold leading-tight">
              Quantidade
              <span className="block font-normal">(volumes)</span>
            </th>
            <th colSpan={SITUACOES.length} className="border border-slate-900 px-1 py-0.5 text-center font-bold">
              Situação (marque um X)
            </th>
          </tr>
          <tr>
            {SITUACOES.map((situacao) => (
              <th
                key={situacao}
                className="w-[62px] border border-slate-900 px-0.5 py-0.5 text-center text-[8.5px] font-bold leading-tight"
              >
                {situacao}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: linhas }).map((_, indice) => {
            const item = itens[indice];
            return (
              <tr key={indice} className="align-top">
                <td className="h-[15px] border border-slate-900 px-1 py-0.5 text-center">
                  {item ? item.ordem : indice + 1}
                </td>
                <td className="border border-slate-900 px-1 py-0.5 text-center font-semibold uppercase leading-tight">
                  {item ? (
                    <>
                      {item.descricao}
                      {item.numeroReferencia && (
                        <span className="block font-normal normal-case text-slate-700">{item.numeroReferencia}</span>
                      )}
                    </>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </td>
                <td className="border border-slate-900 px-1 py-0.5 text-center">{item ? item.quantidade : ""}</td>
                {SITUACOES.map((situacao) => (
                  <td key={situacao} className="border border-slate-900 px-1 py-0.5 text-center" />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-1.5 flex items-end justify-between text-[10.5px] text-slate-900">
        <p>
          <span className="font-bold">Data:</span>{" "}
          <span className="inline-block min-w-[80px] border-b border-slate-900 text-center font-semibold">
            {formatarData(documento.dataDocumento)}
          </span>
        </p>
        <p className="pr-6">
          Recebi em <span className="inline-block w-6 border-b border-slate-900" /> /{" "}
          <span className="inline-block w-6 border-b border-slate-900" /> /{" "}
          <span className="inline-block w-10 border-b border-slate-900" />
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8 text-[10px] text-slate-900">
        <div className="text-center">
          <div className="border-t border-slate-900 pt-1">
            <p className="font-bold">Expedido por:</p>
            <p className="text-[9px] text-slate-700">
              {documento.responsavel}
              {documento.cargoResponsavel ? ` — ${documento.cargoResponsavel}` : ""}
            </p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-900 pt-1">
            <p className="font-bold">Recebido por:</p>
            <p className="text-[9px] text-slate-700">Nome, Cargo, Assinatura e Unidade</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-[8.5px] uppercase tracking-wide text-slate-500">
        <span>{config?.orgaoSigla ?? "EEPMF"}</span>
        <span>·</span>
        <span>Relação de Remessa {numero}</span>
      </div>
    </section>
  );
}

export function RelacaoRemessaDoc({
  documento,
  itens,
  config,
}: {
  documento: DocumentoListado;
  itens: DocumentoItem[];
  config: Configuracao | undefined;
}) {
  const numero = numeroRelacao(documento.numeroLegado, documento.numeroSequencial, documento.ano);

  return (
    <article className="print-area mx-auto max-w-[880px] rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-sm print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0">
      <Via documento={documento} itens={itens} config={config} numero={numero} via="EXPEDIDOR" compacta />

      <div className="my-4 flex items-center gap-3 print:my-3">
        <span className="text-[10px] text-slate-400">✂</span>
        <span className="h-0 flex-1 border-t border-dashed border-slate-400" />
        <span className="text-[9px] uppercase tracking-widest text-slate-400">corte aqui</span>
        <span className="h-0 flex-1 border-t border-dashed border-slate-400" />
      </div>

      <Via documento={documento} itens={itens} config={config} numero={numero} via="RECEBEDOR" compacta />
    </article>
  );
}
