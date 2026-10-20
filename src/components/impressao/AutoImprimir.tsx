"use client";

import { useEffect } from "react";

/**
 * Abre a caixa de impressão automaticamente ao carregar a página de impressão.
 * Usa um pequeno atraso para garantir que as fontes e o CSS já foram aplicados.
 */
export function AutoImprimir({ atraso = 450 }: { atraso?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), atraso);
    return () => window.clearTimeout(timer);
  }, [atraso]);

  return null;
}
