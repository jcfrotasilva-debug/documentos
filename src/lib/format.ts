/* Utilitários de formatação (pt-BR) */

export function hojeISO(): string {
  const agora = new Date();
  const offset = agora.getTimezoneOffset() * 60000;
  return new Date(agora.getTime() - offset).toISOString().slice(0, 10);
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const data = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
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

export function diasEntre(deISO: string, ateISO: string): number {
  const de = new Date(`${deISO}T00:00:00`).getTime();
  const ate = new Date(`${ateISO}T00:00:00`).getTime();
  return Math.round((ate - de) / 86400000);
}

export function textoPrazo(prazo: string | null | undefined): {
  texto: string;
  tom: "ok" | "atencao" | "vencido" | "neutro";
} {
  if (!prazo) return { texto: "Sem prazo", tom: "neutro" };
  const diff = diasEntre(hojeISO(), prazo);
  if (diff < 0) return { texto: `Vencido há ${Math.abs(diff)}d`, tom: "vencido" };
  if (diff === 0) return { texto: "Vence hoje", tom: "atencao" };
  if (diff <= 5) return { texto: `Vence em ${diff}d`, tom: "atencao" };
  return { texto: `Vence em ${diff}d`, tom: "ok" };
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
