"use client";

import { botaoClasses } from "@/components/ui";

export function BotaoImprimir() {
  return (
    <button type="button" className={botaoClasses("primario")} onClick={() => window.print()}>
      🖨 Imprimir / Salvar PDF
    </button>
  );
}
