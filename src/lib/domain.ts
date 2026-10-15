/* Domínio do sistema: tipos, situações e rótulos (pt-BR)
   Alinhado à base oficial (Supabase): documentos + contadores. */

export const TIPOS_DOCUMENTO = [
  "RELACAO_REMESSA",
  "OFICIO",
  "OFICIO_APM",
  "PROTOCOLO",
  "PROCESSO",
  "INFORMACAO",
] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const MOVIMENTACOES = ["EXPEDICAO", "RECEBIMENTO"] as const;
export type Movimentacao = (typeof MOVIMENTACOES)[number];

export const STATUS_DOCUMENTO = [
  "RASCUNHO",
  "EXPEDIDO",
  "EM_TRANSITO",
  "RECEBIDO",
  "ARQUIVADO",
  "CANCELADO",
] as const;
export type StatusDocumento = (typeof STATUS_DOCUMENTO)[number];

export const PRIORIDADES = ["NORMAL", "URGENTE", "MUITO_URGENTE"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const GRAUS_SIGILO = ["OSTENSIVO", "RESTRITO", "SIGILOSO"] as const;
export type GrauSigilo = (typeof GRAUS_SIGILO)[number];

export const MEIOS_ENVIO = [
  "MALOTE",
  "CORREIOS",
  "EMAIL",
  "PROTOCOLO_PRESENCIAL",
  "SEI_ELETRONICO",
  "FAX",
  "OUTRO",
] as const;
export type MeioEnvio = (typeof MEIOS_ENVIO)[number];

type TipoConfig = {
  label: string;
  sigla: string;
  prefixoExpedicao: string;
  prefixoRecebimento: string;
  descricao: string;
  cor: string;
  chip: string;
  /** Nome da espécie como gravado na base oficial. */
  legado: string;
};

export const CONFIG_TIPO: Record<TipoDocumento, TipoConfig> = {
  RELACAO_REMESSA: {
    label: "Relação de Remessa",
    sigla: "RR",
    prefixoExpedicao: "RR",
    prefixoRecebimento: "R-RR",
    descricao: "Relação de documentos e volumes encaminhados em lote.",
    cor: "bg-indigo-600",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    legado: "RELAÇÃO DE REMESSA",
  },
  OFICIO: {
    label: "Ofício",
    sigla: "OF",
    prefixoExpedicao: "OF",
    prefixoRecebimento: "R-OF",
    descricao: "Comunicação oficial expedida a órgãos ou autoridades.",
    cor: "bg-sky-600",
    chip: "bg-sky-50 text-sky-700 ring-sky-200",
    legado: "OFÍCIO",
  },
  OFICIO_APM: {
    label: "Ofício APM",
    sigla: "APM",
    prefixoExpedicao: "OFAPM",
    prefixoRecebimento: "R-APM",
    descricao: "Ofício de Associação de Pais e Mestres (APM).",
    cor: "bg-cyan-600",
    chip: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    legado: "OFÍCIO APM",
  },
  PROTOCOLO: {
    label: "Protocolo",
    sigla: "PRT",
    prefixoExpedicao: "PRT",
    prefixoRecebimento: "R-PRT",
    descricao: "Registro de entrada/saída de expediente protocolado.",
    cor: "bg-teal-600",
    chip: "bg-teal-50 text-teal-700 ring-teal-200",
    legado: "PROTOCOLO",
  },
  PROCESSO: {
    label: "Processo",
    sigla: "PROC",
    prefixoExpedicao: "PROC",
    prefixoRecebimento: "R-PROC",
    descricao: "Processo administrativo autuado e remetido a outra unidade.",
    cor: "bg-violet-600",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
    legado: "PROCESSO",
  },
  INFORMACAO: {
    label: "Informação",
    sigla: "INF",
    prefixoExpedicao: "INF",
    prefixoRecebimento: "R-INF",
    descricao: "Prestação de informação, despacho ou nota técnica.",
    cor: "bg-amber-600",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    legado: "INFORMAÇÃO",
  },
};

export const CONFIG_MOVIMENTACAO: Record<
  Movimentacao,
  { label: string; chip: string; legado: string; seta: string }
> = {
  EXPEDICAO: {
    label: "Expedição",
    chip: "bg-brand-50 text-brand-700 ring-brand-200",
    legado: "EXPEDIÇÃO",
    seta: "↑",
  },
  RECEBIMENTO: {
    label: "Recebimento",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    legado: "RECEBIMENTO",
    seta: "↓",
  },
};

export const CONFIG_STATUS: Record<StatusDocumento, { label: string; chip: string; dot: string }> = {
  RASCUNHO: {
    label: "Rascunho",
    chip: "bg-slate-100 text-slate-700 ring-slate-300",
    dot: "bg-slate-400",
  },
  EXPEDIDO: {
    label: "Expedido",
    chip: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  EM_TRANSITO: {
    label: "Em trânsito",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  RECEBIDO: {
    label: "Recebido",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  ARQUIVADO: {
    label: "Arquivado",
    chip: "bg-slate-100 text-slate-600 ring-slate-300",
    dot: "bg-slate-500",
  },
  CANCELADO: {
    label: "Cancelado",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
};

export const CONFIG_PRIORIDADE: Record<Prioridade, { label: string; chip: string }> = {
  NORMAL: { label: "Normal", chip: "bg-slate-100 text-slate-600 ring-slate-300" },
  URGENTE: { label: "Urgente", chip: "bg-orange-50 text-orange-700 ring-orange-200" },
  MUITO_URGENTE: { label: "Muito urgente", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
};

export const CONFIG_SIGILO: Record<GrauSigilo, { label: string; chip: string }> = {
  OSTENSIVO: { label: "Ostensivo", chip: "bg-slate-100 text-slate-600 ring-slate-300" },
  RESTRITO: { label: "Restrito", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  SIGILOSO: { label: "Sigiloso", chip: "bg-red-50 text-red-700 ring-red-200" },
};

export const CONFIG_MEIO: Record<MeioEnvio, string> = {
  MALOTE: "Malote interno",
  CORREIOS: "Correios / Sedex",
  EMAIL: "E-mail institucional",
  PROTOCOLO_PRESENCIAL: "Protocolo presencial",
  SEI_ELETRONICO: "SEI / Sistema eletrônico",
  FAX: "Fax",
  OUTRO: "Outro",
};

export const STATUS_FLUXO: StatusDocumento[] = [
  "RASCUNHO",
  "EXPEDIDO",
  "EM_TRANSITO",
  "RECEBIDO",
  "ARQUIVADO",
];

export function labelTipo(tipo: TipoDocumento): string {
  return CONFIG_TIPO[tipo]?.label ?? tipo;
}

/** Prefixo padrão de numeração conforme movimentação e espécie. */
export function prefixoPadrao(movimentacao: Movimentacao, tipo: TipoDocumento): string {
  const config = CONFIG_TIPO[tipo];
  if (!config) return tipo.slice(0, 6);
  return movimentacao === "RECEBIMENTO" ? config.prefixoRecebimento : config.prefixoExpedicao;
}

export function rotuloMovimentacao(movimentacao: Movimentacao): string {
  return CONFIG_MOVIMENTACAO[movimentacao]?.label ?? movimentacao;
}

export function ehTipoValido(valor: string): valor is TipoDocumento {
  return (TIPOS_DOCUMENTO as readonly string[]).includes(valor);
}

export function ehMovimentacaoValida(valor: string): valor is Movimentacao {
  return (MOVIMENTACOES as readonly string[]).includes(valor);
}

/** Normaliza a espécie gravada na base oficial para o enum interno. */
export function tipoDoLegado(valor: string): TipoDocumento | null {
  const normalizado = valor
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const direto = TIPOS_DOCUMENTO.find((tipo) => CONFIG_TIPO[tipo].legado.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizado);
  if (direto) return direto;
  if (normalizado.includes("REMESSA")) return "RELACAO_REMESSA";
  if (normalizado.includes("APM")) return "OFICIO_APM";
  if (normalizado.includes("OFICIO")) return "OFICIO";
  if (normalizado.includes("PROCESSO")) return "PROCESSO";
  if (normalizado.includes("PROTOCOLO")) return "PROTOCOLO";
  if (normalizado.includes("INFORMACAO")) return "INFORMACAO";
  return null;
}

export function movimentacaoDoLegado(valor: string): Movimentacao | null {
  const normalizado = valor
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalizado.startsWith("EXPED")) return "EXPEDICAO";
  if (normalizado.startsWith("RECEB")) return "RECEBIMENTO";
  return null;
}
