import { NextRequest } from "next/server";
import { parseFiltros } from "@/lib/filters";
import { listarTodosParaExportacao, montarCSVDocumentos } from "@/lib/services/documentos";
import { hojeISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filtros = parseFiltros(params);
  const linhas = await listarTodosParaExportacao(filtros);
  const csv = montarCSVDocumentos(linhas);
  const nome = `documentos-expedidos-${hojeISO()}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
