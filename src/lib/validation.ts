import { z } from "zod";
import {
  GRAUS_SIGILO,
  MEIOS_ENVIO,
  MOVIMENTACOES,
  PRIORIDADES,
  STATUS_DOCUMENTO,
  TIPOS_DOCUMENTO,
} from "@/lib/domain";

const textoObrigatorio = (campo: string, max = 200) =>
  z.string().trim().min(1, `${campo} é obrigatório`).max(max, `${campo} excede ${max} caracteres`);

const dataISO = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)");

const dataOpcional = z
  .union([dataISO, z.literal(""), z.null()])
  .optional()
  .transform((valor) => (valor === "" || valor === null || valor === undefined ? null : valor));

const textoOpcional = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((valor) => (valor === null || valor === undefined || valor === "" ? null : valor));

export const itemSchema = z.object({
  descricao: textoObrigatorio("Descrição", 240),
  numeroReferencia: textoOpcional(80),
  quantidade: z.coerce.number().int().min(1, "Quantidade mínima é 1").max(9999).default(1),
  valor: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((valor) => {
      if (valor === null || valor === undefined || valor === "") return null;
      const numero = typeof valor === "string" ? Number(valor.replace(",", ".")) : valor;
      return Number.isFinite(numero) ? numero.toFixed(2) : null;
    }),
  observacao: textoOpcional(240),
});

export const documentoInputSchema = z.object({
  movimentacao: z.enum([...MOVIMENTACOES] as [string, ...string[]]).default("EXPEDICAO"),
  tipo: z.enum([...TIPOS_DOCUMENTO] as [string, ...string[]]),
  ano: z.coerce.number().int().min(1990).max(2200).optional(),
  numeroManual: textoOpcional(40),
  dataDocumento: dataISO,
  dataExpedicao: dataOpcional,
  prazoResposta: dataOpcional,
  assunto: textoObrigatorio("Assunto", 240),
  conteudo: z
    .union([z.string().max(12000), z.null()])
    .optional()
    .transform((valor) => valor || null),
  interessado: textoObrigatorio("Interessado", 180),
  numeroProcesso: textoOpcional(80),
  destinatarioNome: textoOpcional(180),
  destinatarioCargo: textoOpcional(140),
  setorOrigemId: z.coerce.number().int().positive().optional().nullable(),
  setorDestinoId: z.coerce.number().int().positive().optional().nullable(),
  responsavel: textoObrigatorio("Responsável", 140),
  cargoResponsavel: textoOpcional(140),
  meioEnvio: z.enum([...MEIOS_ENVIO] as [string, ...string[]]).default("MALOTE"),
  prioridade: z.enum([...PRIORIDADES] as [string, ...string[]]).default("NORMAL"),
  grauSigilo: z.enum([...GRAUS_SIGILO] as [string, ...string[]]).default("OSTENSIVO"),
  status: z.enum([...STATUS_DOCUMENTO] as [string, ...string[]]).default("RASCUNHO"),
  referenciaExterna: textoOpcional(120),
  qtdPaginas: z.coerce.number().int().min(1).max(10000).default(1),
  qtdAnexos: z.coerce.number().int().min(0).max(1000).default(0),
  observacoes: z
    .union([z.string().max(4000), z.null()])
    .optional()
    .transform((valor) => valor || null),
  criadoPor: z.string().trim().max(140).optional(),
  itens: z.array(itemSchema).max(200).default([]),
});

export type DocumentoInput = z.infer<typeof documentoInputSchema>;

export const movimentoInputSchema = z.object({
  status: z.enum([...STATUS_DOCUMENTO] as [string, ...string[]]),
  descricao: z.string().trim().min(3, "Descreva a movimentação").max(240),
  usuario: z.string().trim().max(140).optional(),
});

export const setorInputSchema = z.object({
  sigla: textoObrigatorio("Sigla", 30).transform((v) => v.toUpperCase()),
  nome: textoObrigatorio("Nome", 160),
  tipo: z.enum(["INTERNO", "EXTERNO"]).default("INTERNO"),
  responsavel: textoOpcional(140),
  cargo: textoOpcional(140),
  email: textoOpcional(160),
  telefone: textoOpcional(40),
  endereco: textoOpcional(200),
  cidade: textoOpcional(120),
  uf: z
    .union([z.string().trim().max(2), z.null()])
    .optional()
    .transform((valor) => (valor ? valor.toUpperCase() : null)),
  ativo: z.coerce.boolean().default(true),
});

export const numeracaoInputSchema = z.object({
  movimentacao: z.enum([...MOVIMENTACOES] as [string, ...string[]]).default("EXPEDICAO"),
  tipo: z.enum([...TIPOS_DOCUMENTO] as [string, ...string[]]),
  ano: z.coerce.number().int().min(1990).max(2200),
  prefixo: textoObrigatorio("Prefixo", 14).transform((v) => v.toUpperCase()),
  digitos: z.coerce.number().int().min(1).max(8),
  ultimoNumero: z.coerce.number().int().min(0),
});

/** Ajuste da sequência: o operador informa o PRÓXIMO número que deseja emitir. */
export const ajusteSequenciaSchema = z.object({
  movimentacao: z.enum([...MOVIMENTACOES] as [string, ...string[]]).default("EXPEDICAO"),
  tipo: z.enum([...TIPOS_DOCUMENTO] as [string, ...string[]]),
  ano: z.coerce.number().int().min(1990).max(2200),
  proximo: z.coerce.number().int().min(1, "O próximo número deve ser maior que zero").max(99999999),
  confirmarDuplicidade: z.coerce.boolean().optional().default(false),
});

export const recalculoSequenciaSchema = z.object({
  movimentacao: z.enum([...MOVIMENTACOES] as [string, ...string[]]).optional(),
  tipo: z.enum([...TIPOS_DOCUMENTO] as [string, ...string[]]).optional(),
  ano: z.coerce.number().int().min(1990).max(2200),
});

export const configuracaoInputSchema = z.object({
  orgaoNome: textoObrigatorio("Órgão", 200),
  orgaoUnidade: textoObrigatorio("Unidade", 200),
  orgaoSigla: textoObrigatorio("Sigla do órgão", 20),
  endereco: z.string().trim().max(200).optional().default(""),
  cidade: z.string().trim().max(120).optional().default(""),
  uf: z.string().trim().max(2).optional().default(""),
  cep: z.string().trim().max(12).optional().default(""),
  telefone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  site: z.string().trim().max(160).optional().default(""),
  responsavelPadrao: z.string().trim().max(140).optional().default(""),
  cargoPadrao: z.string().trim().max(140).optional().default(""),
});

export function primeiraMensagemErro(erro: z.ZodError): string {
  const issue = erro.issues[0];
  if (!issue) return "Dados inválidos";
  const caminho = issue.path.join(".");
  return caminho ? `${caminho}: ${issue.message}` : issue.message;
}
