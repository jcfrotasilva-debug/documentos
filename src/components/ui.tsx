import Link from "next/link";
import type { ReactNode } from "react";
import {
  CONFIG_MOVIMENTACAO,
  CONFIG_PRIORIDADE,
  CONFIG_SIGILO,
  CONFIG_STATUS,
  CONFIG_TIPO,
  type GrauSigilo,
  type Movimentacao,
  type Prioridade,
  type StatusDocumento,
  type TipoDocumento,
} from "@/lib/domain";
import { formatarData } from "@/lib/format";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  titulo,
  subtitulo,
  acoes,
  espacamento = "p-5",
}: {
  children?: ReactNode;
  className?: string;
  titulo?: ReactNode;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  espacamento?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {(titulo || acoes) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>}
          </div>
          {acoes && <div className="flex items-center gap-2">{acoes}</div>}
        </header>
      )}
      <div className={espacamento}>{children}</div>
    </section>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        className ?? "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
      {children}
    </span>
  );
}

export function ChipTipo({ tipo }: { tipo: TipoDocumento }) {
  const config = CONFIG_TIPO[tipo];
  return <Badge className={config.chip}>{config.label}</Badge>;
}

export function ChipMovimentacao({ movimentacao }: { movimentacao: Movimentacao }) {
  const config = CONFIG_MOVIMENTACAO[movimentacao];
  return (
    <Badge className={config.chip}>
      <span aria-hidden>{config.seta}</span>
      {config.label}
    </Badge>
  );
}

export function ChipStatus({ status }: { status: StatusDocumento }) {
  const config = CONFIG_STATUS[status];
  return (
    <Badge className={config.chip}>
      <span className={cx("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </Badge>
  );
}

export function ChipPrioridade({ prioridade }: { prioridade: Prioridade }) {
  const config = CONFIG_PRIORIDADE[prioridade];
  return <Badge className={config.chip}>{config.label}</Badge>;
}

export function ChipSigilo({ sigilo }: { sigilo: GrauSigilo }) {
  const config = CONFIG_SIGILO[sigilo];
  return <Badge className={config.chip}>{config.label}</Badge>;
}

const tons = {
  indigo: "from-indigo-500 to-indigo-600",
  sky: "from-sky-500 to-sky-600",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  rose: "from-rose-500 to-rose-600",
  slate: "from-slate-600 to-slate-700",
} as const;

export function StatCard({
  label,
  valor,
  apoio,
  tom = "indigo",
  icone,
}: {
  label: string;
  valor: ReactNode;
  apoio?: ReactNode;
  tom?: keyof typeof tons;
  icone?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        {icone && (
          <span
            className={cx(
              "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-sm text-white",
              tons[tom],
            )}
          >
            {icone}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{valor}</p>
      {apoio && <p className="mt-1 text-xs text-slate-500">{apoio}</p>}
    </div>
  );
}

export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-700">{titulo}</p>
      {descricao && <p className="max-w-md text-xs text-slate-500">{descricao}</p>}
      {acao}
    </div>
  );
}

export function Campo({
  label,
  children,
  dica,
  obrigatorio,
  className,
}: {
  label: string;
  children: ReactNode;
  dica?: string;
  obrigatorio?: boolean;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
        {label}
        {obrigatorio && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {dica && <span className="mt-1 block text-[11px] text-slate-500">{dica}</span>}
    </label>
  );
}

export const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500";

export const selectClasses = `${inputClasses} appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3E%3Cpath d='M5.5 7.5 10 12l4.5-4.5z'/%3E%3C/svg%3E")] bg-[length:18px_18px] bg-[right_0.6rem_center] bg-no-repeat pr-9`;

export function botaoClasses(variante: "primario" | "secundario" | "fantasma" | "perigo" = "primario") {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60";
  if (variante === "primario") return cx(base, "bg-brand-600 text-white shadow-sm hover:bg-brand-700");
  if (variante === "secundario")
    return cx(base, "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50");
  if (variante === "perigo") return cx(base, "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100");
  return cx(base, "text-slate-600 hover:bg-slate-100");
}

export function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</span>
      <span className="text-right text-sm text-slate-800">{valor ?? "—"}</span>
    </div>
  );
}

export function DataCelula({ iso }: { iso: string | null }) {
  return <span className="whitespace-nowrap tabular-nums text-slate-700">{formatarData(iso)}</span>;
}

export function Paginacao({
  page,
  paginas,
  total,
  queryBase,
}: {
  page: number;
  paginas: number;
  total: number;
  queryBase: Record<string, string | number | undefined>;
}) {
  const link = (destino: number) => {
    const params = new URLSearchParams();
    Object.entries(queryBase).forEach(([chave, valor]) => {
      if (valor === undefined || valor === "" || valor === "TODOS") return;
      params.set(chave, String(valor));
    });
    params.set("page", String(destino));
    return `/documentos?${params.toString()}`;
  };

  const janela: number[] = [];
  const inicio = Math.max(1, page - 2);
  const fim = Math.min(paginas, inicio + 4);
  for (let i = inicio; i <= fim; i += 1) janela.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
      <p className="text-xs text-slate-500">
        {total} registro{total === 1 ? "" : "s"} · página {page} de {paginas}
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={link(Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={cx(botaoClasses("secundario"), "px-2 py-1 text-xs", page === 1 && "pointer-events-none opacity-50")}
        >
          Anterior
        </Link>
        {janela.map((numero) => (
          <Link
            key={numero}
            href={link(numero)}
            className={cx(
              "min-w-8 rounded-lg px-2 py-1 text-center text-xs font-medium",
              numero === page
                ? "bg-brand-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {numero}
          </Link>
        ))}
        <Link
          href={link(Math.min(paginas, page + 1))}
          className={cx(
            botaoClasses("secundario"),
            "px-2 py-1 text-xs",
            page >= paginas && "pointer-events-none opacity-50",
          )}
        >
          Próxima
        </Link>
      </div>
    </div>
  );
}
