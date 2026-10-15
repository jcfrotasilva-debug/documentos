import { NextRequest } from "next/server";
import { espiarProximosNumeros } from "@/lib/services/documentos";
import { hojeISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const anoInformado = Number(request.nextUrl.searchParams.get("ano"));
  const ano = Number.isInteger(anoInformado) && anoInformado > 1990 ? anoInformado : Number(hojeISO().slice(0, 4));
  const numeros = await espiarProximosNumeros(ano);
  return Response.json({ ano, numeros });
}
