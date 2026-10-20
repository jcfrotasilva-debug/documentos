import Link from "next/link";
import { botaoClasses } from "@/components/ui";

/**
 * Abre a página dedicada de impressão do detalhamento (`/relatorios/imprimir`).
 * Levar os filtros pela URL garante que o papel contenha exatamente o período
 * que está na tela — e nada além da listagem.
 */
export function BotaoImprimirRelatorio({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className={botaoClasses("primario")}
      title="Abrir a versão para impressão/PDF com apenas o detalhamento do período"
    >
      🖨 Imprimir / PDF
    </Link>
  );
}
