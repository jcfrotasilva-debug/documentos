import {
  MOVIMENTACOES,
  PRIORIDADES,
  STATUS_DOCUMENTO,
  TIPOS_DOCUMENTO,
  type Movimentacao,
  type Prioridade,
  type StatusDocumento,
  type TipoDocumento,
} from "@/lib/domain";
import type { FiltrosDocumento } from "@/lib/services/documentos";

type ValorBruto = string | string[] | undefined;

function primeiro(valor: ValorBruto): string | undefined {
  if (Array.isArray(valor)) return valor[0];
  return valor;
}

export function parseFiltros(params: Record<string, ValorBruto>): Required<
  Pick<FiltrosDocumento, "page" | "pageSize">
> &
  Omit<FiltrosDocumento, "page" | "pageSize"> {
  const tipoBruto = primeiro(params.tipo) ?? "TODOS";
  const movBruto = primeiro(params.movimentacao) ?? primeiro(params.mov) ?? "TODOS";
  const statusBruto = primeiro(params.status) ?? "TODOS";
  const prioridadeBruta = primeiro(params.prioridade) ?? "TODOS";
  const anoBruto = primeiro(params.ano) ?? "TODOS";
  const setorBruto = primeiro(params.setor) ?? primeiro(params.setorId) ?? "TODOS";
  const ordenarBruto = primeiro(params.ordenar) ?? "recentes";

  const tipo = (TIPOS_DOCUMENTO as readonly string[]).includes(tipoBruto)
    ? (tipoBruto as TipoDocumento)
    : "TODOS";
  const movimentacao = (MOVIMENTACOES as readonly string[]).includes(movBruto)
    ? (movBruto as Movimentacao)
    : "TODOS";
  const status = (STATUS_DOCUMENTO as readonly string[]).includes(statusBruto)
    ? (statusBruto as StatusDocumento)
    : "TODOS";
  const prioridade = (PRIORIDADES as readonly string[]).includes(prioridadeBruta)
    ? (prioridadeBruta as Prioridade)
    : "TODOS";
  const ano = anoBruto === "TODOS" || !anoBruto ? ("TODOS" as const) : Number(anoBruto);
  const setorId = setorBruto === "TODOS" || !setorBruto ? ("TODOS" as const) : Number(setorBruto);

  return {
    q: primeiro(params.q)?.trim() || undefined,
    movimentacao,
    tipo,
    status,
    prioridade,
    ano,
    setorId,
    de: primeiro(params.de) || undefined,
    ate: primeiro(params.ate) || undefined,
    ordenar: ["recentes", "antigos", "numero", "assunto"].includes(ordenarBruto)
      ? (ordenarBruto as FiltrosDocumento["ordenar"])
      : "recentes",
    page: Number(primeiro(params.page) ?? 1) || 1,
    pageSize: Number(primeiro(params.pageSize ?? primeiro(params.limite)) ?? 15) || 15,
  };
}

export function filtrosParaQueryString(filtros: Partial<FiltrosDocumento> & { page?: number }): string {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null || valor === "" || valor === "TODOS") return;
    params.set(chave === "setorId" ? "setor" : chave, String(valor));
  });
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}
