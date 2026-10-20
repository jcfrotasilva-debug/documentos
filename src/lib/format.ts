/* ------------------------------------------------------------------ */
/* Datas — todas as regras em um único lugar                          */
/*                                                                    */
/* Por que não usar `new Date()` direto:                              */
/*  • o servidor (Vercel) roda em UTC; no Brasil (UTC-3) isso adianta */
/*    a data em até 3 horas — às 21h de 31/12 o "hoje" já seria       */
/*    01/01 do ano seguinte, jogando o documento no exercício errado; */
/*  • horários exibidos apareceriam 3 horas à frente;                 */
/*  • somar/subtrair meses com Date desloca o dia 1 em fusos positivos.*/
/*                                                                    */
/* Solução: fuso explícito vindo de APP_TIMEZONE e aritmética de      */
/* calendário feita sobre strings AAAA-MM-DD (sem fuso).              */
/* ------------------------------------------------------------------ */

export const FUSO_APP = process.env.APP_TIMEZONE?.trim() || "America/Sao_Paulo";

const formatadorData = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_APP,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data de hoje (AAAA-MM-DD) no fuso da aplicação. */
export function hojeISO(referencia: Date = new Date()): string {
  /* en-CA devolve exatamente AAAA-MM-DD */
  return formatadorData.format(referencia);
}

/** Ano corrente no fuso da aplicação (base da numeração por exercício). */
export function anoAtual(referencia: Date = new Date()): number {
  return Number(hojeISO(referencia).slice(0, 4));
}

/** Mês corrente no formato AAAA-MM. */
export function mesAtual(referencia: Date = new Date()): string {
  return hojeISO(referencia).slice(0, 7);
}

export function validarDataISO(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const casou = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!casou) return null;
  const [, ano, mes, dia] = casou;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  if (
    data.getUTCFullYear() !== Number(ano) ||
    data.getUTCMonth() !== Number(mes) - 1 ||
    data.getUTCDate() !== Number(dia)
  ) {
    return null; // rejeita 2026-02-30, 2026-13-01 etc.
  }
  return `${ano}-${mes}-${dia}`;
}

/** Formata AAAA-MM-DD (ou timestamp) como DD/MM/AAAA. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const apenasData = validarDataISO(iso);
  if (apenasData) {
    const [ano, mes, dia] = apenasData.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_APP,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

/** Data e hora no fuso da aplicação (usado no histórico de movimentações). */
export function formatarDataHora(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const data = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_APP,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export function formatarHora(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const data = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_APP,
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

/** DD de mês por extenso de AAAA (usado no fecho dos documentos). */
export function dataPorExtenso(iso: string, cidade = "", uf = ""): string {
  const valida = validarDataISO(iso);
  if (!valida) return "—";
  const [ano, mes, dia] = valida.split("-").map(Number);
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(ano, mes - 1, dia)));
  const local = [cidade, uf].filter(Boolean).join("/");
  return local ? `${local}, ${texto}` : texto;
}

export function formatarMoeda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (Number.isNaN(numero)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero);
}

export function montarNumero(prefixo: string, sequencial: number, digitos: number, ano: number): string {
  return `${prefixo}-${String(sequencial).padStart(digitos, "0")}/${ano}`;
}

/* ------------------------------------------------------------------ */
/* Aritmética de calendário em strings (imune a fuso e horário de     */
/* verão): tudo é calculado em UTC sobre os componentes da data.      */
/* ------------------------------------------------------------------ */

function emUTC(iso: string): Date | null {
  const valida = validarDataISO(iso);
  if (!valida) return null;
  const [ano, mes, dia] = valida.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function deUTC(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Soma (ou subtrai) dias de uma data AAAA-MM-DD. */
export function deslocarDias(iso: string, dias: number): string {
  const base = emUTC(iso);
  if (!base) return iso;
  base.setUTCDate(base.getUTCDate() + dias);
  return deUTC(base);
}

/** Soma (ou subtrai) meses preservando o dia quando possível (31/01 + 1 mês = 28/02). */
export function deslocarMeses(chaveOuData: string, meses: number): string {
  const iso = chaveOuData.length === 7 ? `${chaveOuData}-01` : chaveOuData;
  const base = emUTC(iso);
  if (!base) return chaveOuData;
  const dia = base.getUTCDate();
  base.setUTCDate(1);
  base.setUTCMonth(base.getUTCMonth() + meses);
  const ultimoDiaDoMes = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(dia, ultimoDiaDoMes));
  const resultado = deUTC(base);
  return chaveOuData.length === 7 ? resultado.slice(0, 7) : resultado;
}

export function primeiroDiaDoMes(chaveOuData: string): string {
  return `${chaveOuData.slice(0, 7)}-01`;
}

export function ultimoDiaDoMes(chaveOuData: string): string {
  const base = emUTC(primeiroDiaDoMes(chaveOuData));
  if (!base) return chaveOuData;
  return deUTC(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)));
}

/** Lista de chaves AAAA-MM, do mais antigo ao mais recente. */
export function serieDeMeses(ateMes: string, quantidade: number): string[] {
  const meses: string[] = [];
  for (let i = quantidade - 1; i >= 0; i -= 1) {
    meses.push(deslocarMeses(ateMes, -i));
  }
  return meses;
}

export function diasEntre(deISO: string, ateISO: string): number {
  const de = emUTC(deISO);
  const ate = emUTC(ateISO);
  if (!de || !ate) return 0;
  return Math.round((ate.getTime() - de.getTime()) / 86_400_000);
}

export function textoPrazo(prazo: string | null | undefined): {
  texto: string;
  tom: "ok" | "atencao" | "vencido" | "neutro";
} {
  if (!prazo) return { texto: "Sem prazo", tom: "neutro" };
  const hoje = hojeISO();
  const diff = diasEntre(hoje, prazo);
  if (diff < 0) return { texto: `Vencido há ${Math.abs(diff)}d`, tom: "vencido" };
  if (diff === 0) return { texto: "Vence hoje", tom: "atencao" };
  if (diff <= 5) return { texto: `Vence em ${diff}d`, tom: "atencao" };
  return { texto: `Vence em ${diff}d`, tom: "ok" };
}

export function linhaEndereco(endereco: string, cidade: string, uf: string, cep: string, telefone: string): string {
  const partes: string[] = [];
  if (endereco) partes.push(endereco);
  const local = [cidade, uf].filter(Boolean).join(" - ");
  if (local) partes.push(cep ? `${local} CEP ${cep}` : local);
  else if (cep) partes.push(`CEP ${cep}`);
  if (telefone) partes.push(`Tel. ${telefone}`);
  return partes.join(" - ");
}

/** Número da Relação de Remessa no padrão do documento oficial (041/2026). */
export function numeroRelacao(numeroLegado: string | null, sequencial: number, ano: number): string {
  const bruto = (numeroLegado ?? "").match(/^(\d+)/)?.[1];
  const seq = Number(bruto ?? sequencial) || sequencial;
  return `${String(seq).padStart(3, "0")}/${ano}`;
}

export function csvCampo(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

export function gerarCSV(cabecalho: string[], linhas: unknown[][]): string {
  const conteudo = [cabecalho.map(csvCampo).join(";"), ...linhas.map((l) => l.map(csvCampo).join(";"))];
  return `\uFEFF${conteudo.join("\r\n")}`;
}

export function iniciais(texto: string): string {
  return texto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}
