import { hojeISO } from "@/lib/format";
import { listarResponsaveis, montarCSVResponsaveis } from "@/lib/services/responsaveis";

export const dynamic = "force-dynamic";

export async function GET() {
  const linhas = await listarResponsaveis();
  const csv = montarCSVResponsaveis(linhas);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="responsaveis-${hojeISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
