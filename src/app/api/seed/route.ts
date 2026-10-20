import { and, count, eq, isNull, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { documentos, numeracao, setores } from "@/db/schema";
import {
  CONFIG_TIPO,
  TIPOS_DOCUMENTO,
  prefixoPadrao,
  type Movimentacao,
  type TipoDocumento,
} from "@/lib/domain";
import { deslocarDias, hojeISO } from "@/lib/format";
import { dadosDemoHabilitados } from "@/lib/runtime";
import { criarDocumento, salvarConfiguracao } from "@/lib/services/documentos";
import { documentoInputSchema, primeiraMensagemErro, type DocumentoInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

/* Unidades e órgãos de uma unidade escolar estadual. */
const SETORES_DEMO = [
  { sigla: "DIRECAO", nome: "Direção da EE Profa. Marlene Frattini", tipo: "INTERNO", responsavel: "Marisa Antunes", cargo: "Diretora de Escola" },
  { sigla: "SECESC", nome: "Secretaria da Escola — Expediente e Protocolo", tipo: "INTERNO", responsavel: "Rafael Duarte", cargo: "Agente de Organização Escolar" },
  { sigla: "SEFREP", nome: "Setor de Frequência e Reposição (SEFREP)", tipo: "INTERNO", responsavel: "Lucilena do Amaral", cargo: "Chefe de Setor" },
  { sigla: "COORD", nome: "Coordenação Pedagógica", tipo: "INTERNO", responsavel: "Paulo Nogueira", cargo: "Coordenador Pedagógico" },
  { sigla: "APM", nome: "Associação de Pais e Mestres (APM)", tipo: "INTERNO", responsavel: "Cláudia Ferreira", cargo: "Presidente da APM" },
  { sigla: "SERVGER", nome: "Serviços Gerais e Manutenção", tipo: "INTERNO", responsavel: "Aline Barbosa", cargo: "Encarregada de Serviços" },
  { sigla: "DE", nome: "Diretoria de Ensino — Região de Campinas", tipo: "EXTERNO", responsavel: "Eduardo Prado", cargo: "Dirigente Regional de Ensino", cidade: "Campinas", uf: "SP" },
  { sigla: "SUP", nome: "Supervisão de Ensino", tipo: "EXTERNO", responsavel: "Helena Martins", cargo: "Supervisora de Ensino", cidade: "Campinas", uf: "SP" },
  { sigla: "NP", nome: "Núcleo Pedagógico", tipo: "EXTERNO", responsavel: "Renata Lopes", cargo: "PCNP — Língua Portuguesa", cidade: "Campinas", uf: "SP" },
  { sigla: "SEDUC", nome: "Secretaria da Educação do Estado", tipo: "EXTERNO", responsavel: "Marcos Tavares", cargo: "Dirigente de Departamento", cidade: "São Paulo", uf: "SP" },
  { sigla: "TCE", nome: "Tribunal de Contas do Estado", tipo: "EXTERNO", responsavel: "Sérgio Almeida", cargo: "Conselheiro", cidade: "São Paulo", uf: "SP" },
  { sigla: "MP", nome: "Ministério Público Estadual", tipo: "EXTERNO", responsavel: "Jorge Lima", cargo: "Promotor de Justiça", cidade: "Campinas", uf: "SP" },
];

type Modelo = Omit<
  DocumentoInput,
  "tipo" | "ano" | "numeroManual" | "criadoPor" | "movimentacao" | "interessado" | "numeroProcesso"
> & {
  tipo: TipoDocumento;
  movimentacao?: Movimentacao;
  interessado?: string;
  numeroProcesso?: string;
};

function deslocar(dias: number): string {
  return deslocarDias(hojeISO(), dias);
}

const MODELOS: Modelo[] = [
  {
    tipo: "OFICIO",
    movimentacao: "EXPEDICAO",
    dataDocumento: deslocar(-42),
    dataExpedicao: deslocar(-41),
    prazoResposta: deslocar(4),
    assunto: "Encaminhamento da prestação de contas dos recursos da APM",
    conteudo:
      "Encaminhamos, para análise e providências de sua alçada, a prestação de contas dos recursos recebidos e aplicados pela Associação de Pais e Mestres desta unidade escolar, acompanhada dos comprovantes de despesa e dos extratos bancários do período.",
    interessado: "SÉRGIO ALMEIDA — CONSELHEIRO",
    destinatarioNome: "Sérgio Almeida",
    destinatarioCargo: "Conselheiro",
    setorOrigemId: 2,
    setorDestinoId: 11,
    responsavel: "Rafael Duarte",
    cargoResponsavel: "Agente de Organização Escolar",
    meioEnvio: "PROTOCOLO_PRESENCIAL",
    prioridade: "NORMAL",
    grauSigilo: "OSTENSIVO",
    status: "EXPEDIDO",
    referenciaExterna: "TC 4120/2026",
    qtdPaginas: 12,
    qtdAnexos: 3,
    observacoes: "Cópia arquivada no prontuário da unidade escolar.",
    itens: [],
  },
  {
    tipo: "RELACAO_REMESSA",
    movimentacao: "EXPEDICAO",
    dataDocumento: deslocar(-30),
    dataExpedicao: deslocar(-29),
    prazoResposta: deslocar(-1),
    assunto: "Remessa de folhas de frequência e requerimentos do mês",
    conteudo:
      "Segue a relação dos documentos de frequência e dos requerimentos dos servidores desta unidade escolar, remetidos ao setor competente para as providências de sua alçada.",
    interessado: "LUCILENA DO AMARAL",
    destinatarioNome: "Lucilena do Amaral",
    destinatarioCargo: "Chefe do SEFREP",
    setorOrigemId: 2,
    setorDestinoId: 3,
    responsavel: "Rafael Duarte",
    cargoResponsavel: "Agente de Organização Escolar",
    meioEnvio: "MALOTE",
    prioridade: "URGENTE",
    grauSigilo: "RESTRITO",
    status: "RECEBIDO",
    referenciaExterna: "RR 2026/0049",
    qtdPaginas: 4,
    qtdAnexos: 4,
    observacoes: "Conferido na entrega pelo malote.",
    itens: [
      {
        descricao: "Folha de frequência do mês anterior — completo",
        numeroReferencia: "RR 000045",
        quantidade: 1,
        valor: null,
        observacao: "Assinada pela chefia imediata",
      },
      {
        descricao: "Requerimento de falta — servidor Matrícula 20431",
        numeroReferencia: "RR 000046",
        quantidade: 1,
        valor: null,
        observacao: null,
      },
      {
        descricao: "Formulário 02 — alteração de sede de controle e frequência",
        numeroReferencia: "015.00164664/2026-75",
        quantidade: 1,
        valor: null,
        observacao: "Processo autuado",
      },
    ],
  },
  {
    tipo: "INFORMACAO",
    movimentacao: "EXPEDICAO",
    dataDocumento: deslocar(-22),
    dataExpedicao: deslocar(-22),
    prazoResposta: deslocar(9),
    assunto: "Informação sobre o plano de recuperação e a busca ativa de estudantes",
    conteudo:
      "Em atenção ao Ofício nº 331/2026, informamos que o plano de recuperação paralela alcançou 92% dos estudantes com desempenho abaixo do esperado, com relatório individualizado por componente curricular e registro das ações de busca ativa realizadas no período.",
    interessado: "JORGE LIMA — PROMOTOR DE JUSTIÇA",
    destinatarioNome: "Jorge Lima",
    destinatarioCargo: "Promotor de Justiça",
    setorOrigemId: 1,
    setorDestinoId: 12,
    responsavel: "Marisa Antunes",
    cargoResponsavel: "Diretora de Escola",
    meioEnvio: "SEI_ELETRONICO",
    prioridade: "MUITO_URGENTE",
    grauSigilo: "OSTENSIVO",
    status: "EXPEDIDO",
    referenciaExterna: "OF-000331/2026",
    qtdPaginas: 6,
    qtdAnexos: 2,
    observacoes: null,
    itens: [],
  },
  {
    tipo: "PROCESSO",
    movimentacao: "EXPEDICAO",
    dataDocumento: deslocar(-15),
    dataExpedicao: deslocar(-14),
    prazoResposta: null,
    assunto: "Extinção contratual — Agente de Organização Escolar",
    conteudo:
      "Encaminha-se o processo administrativo com o levantamento de acumulação de cargos e a minuta de extinção contratual, para análise e manifestação prévia desta Diretoria de Ensino.",
    interessado: "SEFREP — SETOR DE FREQUÊNCIA E REPOSIÇÃO",
    numeroProcesso: "015.00760145/2026-32",
    destinatarioNome: "Eduardo Prado",
    destinatarioCargo: "Dirigente Regional de Ensino",
    setorOrigemId: 2,
    setorDestinoId: 7,
    responsavel: "Rafael Duarte",
    cargoResponsavel: "Agente de Organização Escolar",
    meioEnvio: "MALOTE",
    prioridade: "NORMAL",
    grauSigilo: "OSTENSIVO",
    status: "EM_TRANSITO",
    referenciaExterna: "PROC-000056/2026",
    qtdPaginas: 158,
    qtdAnexos: 6,
    observacoes: "07 volumes originais encaminhados.",
    itens: [
      {
        descricao: "Volumes encaminhados",
        numeroReferencia: "015.00760145/2026-32",
        quantidade: 5,
        valor: null,
        observacao: "07 volumes originais",
      },
    ],
  },
  {
    tipo: "PROTOCOLO",
    movimentacao: "EXPEDICAO",
    dataDocumento: deslocar(-8),
    dataExpedicao: deslocar(-8),
    prazoResposta: deslocar(1),
    assunto: "Protocolo de requerimento de docente sobre designação de aulas",
    conteudo:
      "Registra-se o protocolo do requerimento nº 118/2026, por meio do qual a docente solicita informações sobre o cronograma de designação de aulas e a classificação na atribuição de classes e aulas desta unidade escolar.",
    destinatarioNome: "Helena Martins",
    destinatarioCargo: "Supervisora de Ensino",
    setorOrigemId: 1,
    setorDestinoId: 8,
    responsavel: "Marisa Antunes",
    cargoResponsavel: "Diretora de Escola",
    meioEnvio: "EMAIL",
    prioridade: "URGENTE",
    grauSigilo: "OSTENSIVO",
    status: "EXPEDIDO",
    referenciaExterna: "REQ 118/2026",
    qtdPaginas: 2,
    qtdAnexos: 0,
    observacoes: "Prazo regimental de resposta.",
    itens: [],
  },
  {
    tipo: "PROTOCOLO",
    movimentacao: "RECEBIMENTO",
    dataDocumento: deslocar(-5),
    dataExpedicao: deslocar(-5),
    prazoResposta: deslocar(14),
    assunto: "Proposta de trabalho para atuação do PAPE 2026",
    conteudo:
      "Recebida a proposta de trabalho para atuação junto ao Programa de Apoio Pedagógico Especializado, protocolada para análise e manifestação técnica desta unidade escolar.",
    interessado: "PATRICIA APARECIDA RODRIGUES PEREIRA",
    destinatarioNome: "Patricia Aparecida Rodrigues Pereira",
    destinatarioCargo: "Professora designada",
    setorOrigemId: 9,
    setorDestinoId: 2,
    responsavel: "Rafael Duarte",
    cargoResponsavel: "Agente de Organização Escolar",
    meioEnvio: "PROTOCOLO_PRESENCIAL",
    prioridade: "NORMAL",
    grauSigilo: "OSTENSIVO",
    status: "RECEBIDO",
    referenciaExterna: "R-PRT 2026",
    qtdPaginas: 3,
    qtdAnexos: 1,
    observacoes: null,
    itens: [],
  },
  {
    tipo: "OFICIO_APM",
    movimentacao: "EXPEDICAO",
    dataDocumento: deslocar(-3),
    dataExpedicao: null,
    prazoResposta: deslocar(12),
    assunto: "Incorporação 2025 — prestação de contas da APM",
    conteudo:
      "Encaminhamos a prestação de contas referente à incorporação do exercício de 2025, com a relação de bens adquiridos e a documentação fiscal correspondente, para ciência e providências da Associação de Pais e Mestres.",
    interessado: "CLÁUDIA FERREIRA — PRESIDENTE DA APM",
    destinatarioNome: "Cláudia Ferreira",
    destinatarioCargo: "Presidente da APM",
    setorOrigemId: 1,
    setorDestinoId: 5,
    responsavel: "Marisa Antunes",
    cargoResponsavel: "Diretora de Escola",
    meioEnvio: "EMAIL",
    prioridade: "NORMAL",
    grauSigilo: "OSTENSIVO",
    status: "RASCUNHO",
    referenciaExterna: null,
    qtdPaginas: 1,
    qtdAnexos: 1,
    observacoes: "Minuta aguardando revisão final.",
    itens: [],
  },
  {
    tipo: "INFORMACAO",
    movimentacao: "EXPEDICAO",
    dataDocumento: deslocar(-1),
    dataExpedicao: null,
    prazoResposta: null,
    assunto: "Informação sigilosa — sindicância administrativa nº 07/2026",
    conteudo:
      "Informamos o andamento da sindicância administrativa instaurada pela Portaria nº 07/2026, cujo relatório conclusivo será apresentado no prazo regulamentar.",
    interessado: "SERVIDORES ENVOLVIDOS — SINDICÂNCIA 07/2026",
    destinatarioNome: "Marisa Antunes",
    destinatarioCargo: "Diretora de Escola",
    setorOrigemId: 2,
    setorDestinoId: 1,
    responsavel: "Rafael Duarte",
    cargoResponsavel: "Agente de Organização Escolar",
    meioEnvio: "PROTOCOLO_PRESENCIAL",
    prioridade: "MUITO_URGENTE",
    grauSigilo: "SIGILOSO",
    status: "EXPEDIDO",
    referenciaExterna: "PORT 07/2026",
    qtdPaginas: 3,
    qtdAnexos: 2,
    observacoes: "Acesso restrito conforme LGPD.",
    itens: [],
  },
];

/* Ponto de partida dos contadores: espelha a base oficial para o exercício corrente. */
const CONTADORES_OFICIAIS: { movimentacao: Movimentacao; tipo: TipoDocumento; valor: number }[] = [
  { movimentacao: "EXPEDICAO", tipo: "OFICIO", valor: 79 },
  { movimentacao: "EXPEDICAO", tipo: "OFICIO_APM", valor: 1 },
  { movimentacao: "EXPEDICAO", tipo: "PROCESSO", valor: 76 },
  { movimentacao: "EXPEDICAO", tipo: "RELACAO_REMESSA", valor: 49 },
  { movimentacao: "EXPEDICAO", tipo: "PROTOCOLO", valor: 9 },
  { movimentacao: "RECEBIMENTO", tipo: "PROTOCOLO", valor: 27 },
];

const CONFIGURACAO_ESCOLAR = {
  orgaoNome: "EE PROFA. MARLENE FRATTINI",
  orgaoUnidade: "Serviço de Expediente e Protocolo Escolar",
  orgaoSigla: "EEPMF",
  orgaoHierarquia: "GOVERNO DO ESTADO DE SÃO PAULO|SECRETARIA DE ESTADO DA EDUCAÇÃO",
  logoUrl: "",
  endereco: "Rua Projetada, 500 — Jardim das Acácias",
  cidade: "Campinas",
  uf: "SP",
  cep: "13000-000",
  telefone: "(19) 3400-1000",
  email: "eeprofamarlenefrattini@educacao.sp.gov.br",
  site: "www.educacao.sp.gov.br",
  responsavelPadrao: "Marisa Antunes",
  cargoPadrao: "Diretora de Escola",
};

export async function POST(request: NextRequest) {
  /* Em produção os dados de demonstração ficam bloqueados: só a base real deve entrar. */
  if (!dadosDemoHabilitados()) {
    return Response.json(
      {
        ok: false,
        demoDesabilitado: true,
        erro:
          "Carga de demonstração desabilitada. Defina HABILITAR_DADOS_DEMO=true no ambiente para habilitar (apenas em testes).",
      },
      { status: 403 },
    );
  }

  const forcar = request.nextUrl.searchParams.get("forcar") === "1";
  /* Considera apenas os registros locais: os espelhados da base oficial não impedem a carga. */
  const existentes = await db
    .select({ total: count() })
    .from(documentos)
    .where(isNull(documentos.origemExterna));
  const total = Number(existentes[0]?.total ?? 0);
  if (total > 0 && !forcar) {
    return Response.json({ ok: true, mensagem: "Base já possui documentos cadastrados.", total });
  }

  const quantidadeSetores = await db.select({ total: count() }).from(setores);
  if (Number(quantidadeSetores[0]?.total ?? 0) === 0) {
    await db.insert(setores).values(SETORES_DEMO);
  }

  await salvarConfiguracao(CONFIGURACAO_ESCOLAR);

  const listaSetores = await db.select({ id: setores.id }).from(setores).orderBy(setores.id);
  const mapaPosicao = new Map(listaSetores.map((s, indice) => [indice + 1, s.id]));

  const ano = Number(hojeISO().slice(0, 4));
  for (const tipo of TIPOS_DOCUMENTO) {
    for (const movimentacao of ["EXPEDICAO", "RECEBIMENTO"] as Movimentacao[]) {
      await db
        .insert(numeracao)
        .values({
          movimentacao,
          tipo,
          ano,
          prefixo: prefixoPadrao(movimentacao, tipo),
          digitos: 5,
          ultimoNumero: 0,
        })
        .onConflictDoNothing({ target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano] });
    }
  }

  for (const contador of CONTADORES_OFICIAIS) {
    await db
      .insert(numeracao)
      .values({
        movimentacao: contador.movimentacao,
        tipo: contador.tipo,
        ano,
        prefixo: prefixoPadrao(contador.movimentacao, contador.tipo),
        digitos: 5,
        ultimoNumero: contador.valor,
      })
      .onConflictDoUpdate({
        target: [numeracao.movimentacao, numeracao.tipo, numeracao.ano],
        set: { ultimoNumero: sql`greatest(${numeracao.ultimoNumero}, ${contador.valor})` },
      });
  }

  let criados = 0;
  const erros: string[] = [];
  for (const modelo of MODELOS) {
    const payload = {
      ...modelo,
      movimentacao: modelo.movimentacao ?? "EXPEDICAO",
      setorOrigemId: modelo.setorOrigemId ? mapaPosicao.get(modelo.setorOrigemId) ?? null : null,
      setorDestinoId: modelo.setorDestinoId ? mapaPosicao.get(modelo.setorDestinoId) ?? null : null,
      criadoPor: modelo.responsavel,
    };
    const analise = documentoInputSchema.safeParse(payload);
    if (!analise.success) {
      erros.push(`${modelo.tipo}: ${primeiraMensagemErro(analise.error)}`);
      continue;
    }
    await criarDocumento(analise.data, analise.data.criadoPor || "Carga inicial");
    criados += 1;
  }

  return Response.json({ ok: true, criados, erros });
}

export async function GET() {
  const [setoresTotal, docsLocais, docsOficiais] = await Promise.all([
    db.select({ total: count() }).from(setores),
    db.select({ total: count() }).from(documentos).where(isNull(documentos.origemExterna)),
    db
      .select({ total: count() })
      .from(documentos)
      .where(and(eq(documentos.origemExterna, "SUPABASE"))),
  ]);
  return Response.json({
    demoHabilitado: dadosDemoHabilitados(),
    setores: Number(setoresTotal[0]?.total ?? 0),
    documentosLocais: Number(docsLocais[0]?.total ?? 0),
    documentosBaseOficial: Number(docsOficiais[0]?.total ?? 0),
    tipos: TIPOS_DOCUMENTO.map((tipo) => CONFIG_TIPO[tipo].label),
    orgao: CONFIGURACAO_ESCOLAR.orgaoNome,
  });
}
