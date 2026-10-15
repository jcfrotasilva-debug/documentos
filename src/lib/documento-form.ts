import {
  type GrauSigilo,
  type MeioEnvio,
  type Movimentacao,
  type Prioridade,
  type StatusDocumento,
  type TipoDocumento,
} from "@/lib/domain";
import { hojeISO } from "@/lib/format";

export type ItemForm = {
  descricao: string;
  numeroReferencia: string;
  quantidade: number;
  valor: string;
  observacao: string;
};

export type DocumentoFormValores = {
  id?: number;
  movimentacao: Movimentacao;
  tipo: TipoDocumento;
  numero: string;
  dataDocumento: string;
  dataExpedicao: string;
  prazoResposta: string;
  assunto: string;
  conteudo: string;
  interessado: string;
  numeroProcesso: string;
  responsavel: string;
  cargoResponsavel: string;
  meioEnvio: MeioEnvio;
  prioridade: Prioridade;
  grauSigilo: GrauSigilo;
  status: StatusDocumento;
  referenciaExterna: string;
  qtdPaginas: number;
  qtdAnexos: number;
  observacoes: string;
  itens: ItemForm[];
};

export const itemVazio: ItemForm = {
  descricao: "",
  numeroReferencia: "",
  quantidade: 1,
  valor: "",
  observacao: "",
};

export function valoresIniciais(opcoes: {
  responsavelPadrao?: string;
  cargoPadrao?: string;
  documento?: Partial<DocumentoFormValores> & { itens?: ItemForm[] };
}): DocumentoFormValores {
  const base: DocumentoFormValores = {
    movimentacao: "EXPEDICAO",
    tipo: "OFICIO",
    numero: "",
    dataDocumento: hojeISO(),
    dataExpedicao: "",
    prazoResposta: "",
    assunto: "",
    conteudo: "",
    interessado: "",
    numeroProcesso: "",
    responsavel: opcoes.responsavelPadrao ?? "",
    cargoResponsavel: opcoes.cargoPadrao ?? "",
    meioEnvio: "MALOTE",
    prioridade: "NORMAL",
    grauSigilo: "OSTENSIVO",
    status: "EXPEDIDO",
    referenciaExterna: "",
    qtdPaginas: 1,
    qtdAnexos: 0,
    observacoes: "",
    itens: [],
  };
  return { ...base, ...opcoes.documento, itens: opcoes.documento?.itens ?? [] };
}
