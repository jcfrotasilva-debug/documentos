import { diagnosticarBanco, emNuvem, infoConexao } from "@/db";
import { supabaseConfigurada, supabaseUrl } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Healthcheck com diagnóstico. Usado pelo monitoramento e pela tela /diagnostico.
 * 200 → banco acessível e tabelas presentes.
 * 503 → alguma dependência indisponível (com o motivo no corpo).
 */
export async function GET() {
  const banco = await diagnosticarBanco();
  const conexao = infoConexao();
  const ok = banco.conectado && banco.faltando.length === 0;

  return Response.json(
    {
      ok,
      ambiente: process.env.NODE_ENV,
      banco: {
        conectado: banco.conectado,
        latenciaMs: banco.latenciaMs,
        urlConfigurada: conexao.configurado,
        host: conexao.host,
        porta: conexao.porta,
        usuario: conexao.usuario,
        ssl: conexao.ssl,
        viaPooler: conexao.viaPooler,
        modoPooler: conexao.modoPooler,
        conexaoDiretaIpv6: conexao.ipv6Direto,
        localhostEmNuvem: conexao.localEmNuvem,
        emNuvem: emNuvem(),
        tabelas: banco.tabelas,
        faltando: banco.faltando,
        erro: banco.erro,
        dica: banco.dica,
      },
      baseOficial: {
        configurada: supabaseConfigurada(),
        endereco: supabaseUrl(),
      },
      dadosDemo: process.env.HABILITAR_DADOS_DEMO === "true",
    },
    { status: ok ? 200 : 503 },
  );
}
