/** Sinalizadores de ambiente para operação em produção. */

/** Dados de demonstração só podem ser carregados com liberação explícita. */
export function dadosDemoHabilitados(): boolean {
  return process.env.HABILITAR_DADOS_DEMO === "true";
}

export function ambienteProducao(): boolean {
  return process.env.NODE_ENV === "production";
}
