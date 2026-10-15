/**
 * Extrai o texto completo de um erro, percorrendo a cadeia de causas.
 * O Drizzle encapsula falhas do driver pg em "Failed query: ...", deixando a
 * mensagem real (violação de unicidade, permissão, etc.) em `cause`.
 */
export function textoDoErro(erro: unknown): string {
  const partes: string[] = [];
  let atual: unknown = erro;
  let profundidade = 0;

  while (atual && profundidade < 5) {
    if (atual instanceof Error) {
      partes.push(atual.message);
      const codigo = (atual as Error & { code?: string; constraint?: string; detail?: string }).code;
      const restricao = (atual as Error & { constraint?: string }).constraint;
      const detalhe = (atual as Error & { detail?: string }).detail;
      if (codigo) partes.push(String(codigo));
      if (restricao) partes.push(String(restricao));
      if (detalhe) partes.push(String(detalhe));
      atual = (atual as Error & { cause?: unknown }).cause;
    } else {
      partes.push(String(atual));
      break;
    }
    profundidade += 1;
  }

  return partes.join(" | ");
}

/** true quando a falha é violação de unicidade (Postgres 23505) do índice/restrição informados. */
export function ehViolacaoUnicidade(erro: unknown, nomes: string[]): boolean {
  const texto = textoDoErro(erro);
  if (!/23505|duplicate key value|unique constraint/i.test(texto)) return false;
  return nomes.some((nome) => texto.includes(nome));
}
