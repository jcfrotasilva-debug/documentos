import Link from "next/link";
import { DocumentoForm } from "@/components/DocumentoForm";
import { botaoClasses, cx } from "@/components/ui";
import { valoresIniciais } from "@/lib/documento-form";
import { CONFIG_MOVIMENTACAO } from "@/lib/domain";
import { hojeISO } from "@/lib/format";
import { anosDisponiveis, buscarConfiguracao, espiarProximosNumeros } from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

export default async function NovoDocumentoPage() {
  const anoAtual = Number(hojeISO().slice(0, 4));
  const [config, anos, previsoes] = await Promise.all([
    buscarConfiguracao(),
    anosDisponiveis(),
    espiarProximosNumeros(anoAtual),
  ]);

  const valores = valoresIniciais({
    responsavelPadrao: config?.responsavelPadrao ?? "",
    cargoPadrao: config?.cargoPadrao ?? "",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Registro</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Novo documento</h1>
          <p className="mt-1 text-sm text-slate-500">
            Escolha a movimentação e a espécie: o número é gerado automaticamente na sequência correta. A data vem
            preenchida com hoje e pode ser editada.
          </p>
        </div>
        <Link href="/documentos" className={botaoClasses("secundario")}>
          Voltar ao acervo
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Próximas numerações do exercício {anoAtual}
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {(["EXPEDICAO", "RECEBIMENTO"] as const).map((movimentacao) => (
            <div key={movimentacao}>
              <p className={cx("mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", CONFIG_MOVIMENTACAO[movimentacao].chip)}>
                {CONFIG_MOVIMENTACAO[movimentacao].seta} {CONFIG_MOVIMENTACAO[movimentacao].label}
              </p>
              <ul className="flex flex-wrap gap-2">
                {previsoes
                  .filter((previsao) => previsao.movimentacao === movimentacao)
                  .map((previsao) => (
                    <li
                      key={`${previsao.movimentacao}-${previsao.tipo}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700"
                    >
                      {previsao.numero}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <DocumentoForm modo="novo" valores={valores} anos={anos} anoAtual={anoAtual} />
    </div>
  );
}
