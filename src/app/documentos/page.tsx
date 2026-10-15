import Link from "next/link";
import { FiltrosDocumentos } from "@/components/FiltrosDocumentos";
import { TabelaDocumentos } from "@/components/TabelaDocumentos";
import { Card, EmptyState, Paginacao, botaoClasses, cx } from "@/components/ui";
import { parseFiltros } from "@/lib/filters";
import { CONFIG_TIPO, ehTipoValido, type TipoDocumento } from "@/lib/domain";
import { anosDisponiveis, listarDocumentos } from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentosPage({ searchParams }: Props) {
  const params = await searchParams;
  const filtros = parseFiltros(params);

  const [resultado, anos] = await Promise.all([listarDocumentos(filtros), anosDisponiveis()]);

  const tipoAtivo: TipoDocumento | null =
    filtros.tipo && filtros.tipo !== "TODOS" && ehTipoValido(filtros.tipo) ? filtros.tipo : null;

  const queryBase: Record<string, string | number | undefined> = {
    q: filtros.q,
    movimentacao: filtros.movimentacao,
    tipo: filtros.tipo,
    status: filtros.status,
    prioridade: filtros.prioridade,
    ano: filtros.ano,
    setor: filtros.setorId,
    de: filtros.de,
    ate: filtros.ate,
    ordenar: filtros.ordenar,
    pageSize: filtros.pageSize,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Documentos expedidos e recebidos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acervo completo com numeração automática por movimentação, espécie e exercício, com rastreabilidade das
            tramitações.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/relatorios" className={botaoClasses("secundario")}>
            Relatórios
          </Link>
          <Link href="/documentos/novo" className={botaoClasses("primario")}>
            + Novo documento
          </Link>
        </div>
      </div>

      <FiltrosDocumentos
        valores={{
          q: filtros.q ?? "",
          movimentacao: filtros.movimentacao ?? "TODOS",
          tipo: filtros.tipo ?? "TODOS",
          status: filtros.status ?? "TODOS",
          prioridade: filtros.prioridade ?? "TODOS",
          ano: filtros.ano ? String(filtros.ano) : "TODOS",
          de: filtros.de ?? "",
          ate: filtros.ate ?? "",
          ordenar: filtros.ordenar ?? "recentes",
          pageSize: String(filtros.pageSize ?? 15),
        }}
        anos={anos}
        total={resultado.total}
      />

      {tipoAtivo && (
        <p className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-2 text-xs text-brand-700">
          Filtrando por <strong>{CONFIG_TIPO[tipoAtivo].label}</strong> — {CONFIG_TIPO[tipoAtivo].descricao}
        </p>
      )}

      <Card espacamento="p-0" className="overflow-hidden">
        {resultado.linhas.length === 0 ? (
          <div className="p-5">
            <EmptyState
              titulo="Nenhum documento encontrado"
              descricao="Ajuste os filtros de busca ou cadastre um novo expediente para iniciar o controle."
              acao={
                <Link href="/documentos/novo" className={cx(botaoClasses("primario"), "mt-2")}>
                  Cadastrar documento
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <TabelaDocumentos documentos={resultado.linhas} />
            <Paginacao
              page={resultado.page}
              paginas={resultado.paginas}
              total={resultado.total}
              queryBase={queryBase}
            />
          </>
        )}
      </Card>
    </div>
  );
}
