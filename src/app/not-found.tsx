import Link from "next/link";
import { botaoClasses } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="font-mono text-5xl font-semibold text-slate-300">404</p>
      <h1 className="text-lg font-semibold text-slate-800">Registro não localizado</h1>
      <p className="max-w-md text-sm text-slate-500">
        O documento ou a página solicitada não existe, foi cancelada ou você não possui acesso a ela.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Link href="/documentos" className={botaoClasses("primario")}>
          Ir para o acervo
        </Link>
        <Link href="/" className={botaoClasses("secundario")}>
          Painel geral
        </Link>
      </div>
    </div>
  );
}
