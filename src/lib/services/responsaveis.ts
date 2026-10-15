import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { documentos, responsaveis, type Responsavel } from "@/db/schema";

export type ResponsavelComUso = Responsavel & {
  documentos: number;
  ultimaEmissao: string | null;
};

/** Responsáveis cadastrados, com volume de documentos e data da última emissão. */
export async function listarResponsaveis(): Promise<ResponsavelComUso[]> {
  const [lista, uso] = await Promise.all([
    db.select().from(responsaveis).orderBy(asc(responsaveis.nome)),
    db
      .select({
        nome: documentos.responsavel,
        total: count(),
        ultima: sql<string | null>`max(${documentos.dataDocumento})`,
      })
      .from(documentos)
      .groupBy(documentos.responsavel),
  ]);

  const mapa = new Map(
    uso.map((linha) => [linha.nome, { documentos: Number(linha.total), ultimaEmissao: linha.ultima ?? null }]),
  );

  return lista.map((registro) => ({
    ...registro,
    documentos: mapa.get(registro.nome)?.documentos ?? 0,
    ultimaEmissao: mapa.get(registro.nome)?.ultimaEmissao ?? null,
  }));
}

/** Lista enxuta para uso em formulários (apenas ativos). */
export async function listarResponsaveisAtivos(): Promise<{ id: number; nome: string; cargo: string | null }[]> {
  return db
    .select({ id: responsaveis.id, nome: responsaveis.nome, cargo: responsaveis.cargo })
    .from(responsaveis)
    .where(eq(responsaveis.ativo, true))
    .orderBy(asc(responsaveis.nome));
}

export async function buscarResponsavelPorNome(nome: string): Promise<Responsavel | null> {
  const [registro] = await db.select().from(responsaveis).where(eq(responsaveis.nome, nome)).limit(1);
  return registro ?? null;
}

export type ResponsavelEntrada = {
  nome: string;
  cargo: string | null;
  matricula: string | null;
  documentoIdentidade: string | null;
  email: string | null;
  telefone: string | null;
  lotacao: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export async function criarResponsavel(dados: ResponsavelEntrada): Promise<Responsavel> {
  const [criado] = await db.insert(responsaveis).values(dados).returning();
  return criado;
}

export async function atualizarResponsavel(
  id: number,
  dados: ResponsavelEntrada,
  sincronizarDocumentos = true,
): Promise<{ registro: Responsavel; documentosAtualizados: number } | null> {
  const [anterior] = await db.select().from(responsaveis).where(eq(responsaveis.id, id)).limit(1);
  if (!anterior) return null;

  const [registro] = await db
    .update(responsaveis)
    .set({ ...dados, atualizadoEm: new Date() })
    .where(eq(responsaveis.id, id))
    .returning();

  let documentosAtualizados = 0;

  /* Mantém o acervo coerente: nome e cargo propagam para os documentos vinculados. */
  if (sincronizarDocumentos) {
    if (anterior.nome !== dados.nome) {
      const renomeados = await db
        .update(documentos)
        .set({ responsavel: dados.nome, atualizadoEm: new Date() })
        .where(eq(documentos.responsavel, anterior.nome))
        .returning({ id: documentos.id });
      documentosAtualizados += renomeados.length;
    }
    if ((anterior.cargo ?? "") !== (dados.cargo ?? "")) {
      const cargos = await db
        .update(documentos)
        .set({ cargoResponsavel: dados.cargo, atualizadoEm: new Date() })
        .where(eq(documentos.responsavel, dados.nome))
        .returning({ id: documentos.id });
      documentosAtualizados += cargos.length;
    }
  }

  return { registro, documentosAtualizados };
}

export async function excluirResponsavel(id: number): Promise<
  { ok: true } | { ok: false; motivo: string; documentos: number }
> {
  const [registro] = await db.select().from(responsaveis).where(eq(responsaveis.id, id)).limit(1);
  if (!registro) return { ok: false, motivo: "Responsável não encontrado.", documentos: 0 };

  const [uso] = await db
    .select({ total: count() })
    .from(documentos)
    .where(eq(documentos.responsavel, registro.nome));
  const total = Number(uso?.total ?? 0);

  if (total > 0) {
    return {
      ok: false,
      motivo:
        "Este responsável assina documentos no acervo. Inative-o para tirá-lo das novas emissões sem perder o histórico.",
      documentos: total,
    };
  }

  await db.delete(responsaveis).where(eq(responsaveis.id, id));
  return { ok: true };
}

/** Cria registros para nomes já existentes no acervo, com o cargo mais recente usado. */
export async function importarResponsaveisDoAcervo(): Promise<{ criados: number; ignorados: number }> {
  const [jaCadastrados, usados] = await Promise.all([
    db.select({ nome: responsaveis.nome }).from(responsaveis),
    db
      .select({
        nome: documentos.responsavel,
        cargo: sql<string | null>`max(${documentos.cargoResponsavel})`,
      })
      .from(documentos)
      .groupBy(documentos.responsavel)
      .orderBy(asc(documentos.responsavel)),
  ]);

  const existentes = new Set(jaCadastrados.map((linha) => linha.nome));
  /* Ignora marcadores técnicos criados pela sincronização da base oficial. */
  const tecnico = (nome: string) => /sincroniza|importa[çc]|base oficial|sistema/i.test(nome);
  const novos = usados.filter(
    (linha) => linha.nome.trim() && !existentes.has(linha.nome) && !tecnico(linha.nome),
  );

  if (novos.length === 0) return { criados: 0, ignorados: usados.length };

  await db.insert(responsaveis).values(
    novos.map((linha) => ({
      nome: linha.nome.slice(0, 140),
      cargo: linha.cargo?.slice(0, 140) ?? null,
      ativo: true,
    })),
  );

  return { criados: novos.length, ignorados: usados.length - novos.length };
}

export function montarCSVResponsaveis(linhas: ResponsavelComUso[]): string {
  const cabecalho = ["Nome", "Cargo", "Matrícula", "E-mail", "Telefone", "Lotação", "Ativo", "Documentos", "Última emissão"];
  const dados = linhas.map((linha) => [
    linha.nome,
    linha.cargo ?? "",
    linha.matricula ?? "",
    linha.email ?? "",
    linha.telefone ?? "",
    linha.lotacao ?? "",
    linha.ativo ? "sim" : "não",
    linha.documentos,
    linha.ultimaEmissao ?? "",
  ]);
  return [
    cabecalho.join(";"),
    ...dados.map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");
}
