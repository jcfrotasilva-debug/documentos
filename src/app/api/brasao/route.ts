import { db } from "@/db";
import { configuracoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolverBrasao } from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

/**
 * Serve a imagem do brasão guardada no banco.
 * Necessário porque ambientes serverless (Vercel) não permitem gravar arquivos em disco.
 * Se não houver imagem enviada, cai para o arquivo versionado em /public.
 */
export async function GET() {
  const [config] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1)).limit(1);
  const brasao = resolverBrasao(config ?? null);

  if (!brasao.temImagem || !config?.logoDados) {
    /* Sem upload: redireciona para o arquivo público ou a URL externa, quando houver. */
    if (brasao.src) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: brasao.src,
          "Cache-Control": "public, max-age=300",
        },
      });
    }
    return new Response("Nenhum brasão cadastrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const encontrado = config.logoDados.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
  if (!encontrado) {
    return new Response("Imagem inválida no banco.", { status: 422 });
  }

  const [, tipo, base64] = encontrado;
  const bytes = Buffer.from(base64.replace(/\s/g, ""), "base64");
  const versao = brasao.versao;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": tipo,
      "Content-Length": String(bytes.byteLength),
      /* Cacheia por versão: o ?v= muda a cada upload. */
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${versao}"`,
    },
  });
}
