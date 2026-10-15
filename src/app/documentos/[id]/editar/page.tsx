import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentoForm } from "@/components/DocumentoForm";
import { botaoClasses } from "@/components/ui";
import { hojeISO } from "@/lib/format";
import type { DocumentoFormValores, ItemForm } from "@/lib/documento-form";
import { anosDisponiveis, buscarDocumento } from "@/lib/services/documentos";
import { listarResponsaveisAtivos } from "@/lib/services/responsaveis";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditarDocumentoPage({ params }: Props) {
  const { id } = await params;
  const numeroId = Number(id);
  if (!Number.isInteger(numeroId)) notFound();

  const registro = await buscarDocumento(numeroId);
  if (!registro) notFound();

  const [anos, responsaveis] = await Promise.all([anosDisponiveis(), listarResponsaveisAtivos()]);
  const { documento, itens } = registro;

  const itensForm: ItemForm[] = itens.map((item) => ({
    descricao: item.descricao,
    numeroReferencia: item.numeroReferencia ?? "",
    quantidade: item.quantidade,
    valor: item.valor ?? "",
    observacao: item.observacao ?? "",
  }));

  const valores: DocumentoFormValores = {
    id: documento.id,
    movimentacao: documento.movimentacao,
    tipo: documento.tipo,
    numero: documento.numero,
    dataDocumento: documento.dataDocumento,
    dataExpedicao: documento.dataExpedicao ?? "",
    prazoResposta: documento.prazoResposta ?? "",
    assunto: documento.assunto,
    conteudo: documento.conteudo ?? "",
    interessado: documento.interessado ?? documento.destinatarioNome ?? "",
    numeroProcesso: documento.numeroProcesso ?? "",
    responsavel: documento.responsavel,
    cargoResponsavel: documento.cargoResponsavel ?? "",
    meioEnvio: documento.meioEnvio,
    prioridade: documento.prioridade,
    grauSigilo: documento.grauSigilo,
    status: documento.status,
    referenciaExterna: documento.referenciaExterna ?? "",
    qtdPaginas: documento.qtdPaginas,
    qtdAnexos: documento.qtdAnexos,
    observacoes: documento.observacoes ?? "",
    itens: itensForm,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Edição de registro</p>
          <h1 className="font-mono text-xl font-semibold tracking-tight text-slate-900">{documento.numero}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ajuste dados, prazos, classificação e a relação de itens. A numeração permanece vinculada ao exercício{" "}
            {documento.ano} (ano corrente: {hojeISO().slice(0, 4)}).
            {documento.origemExterna === "SUPABASE" && (
              <span className="ml-1 font-semibold text-amber-700">
                Registro sincronizado da base oficial (id {documento.origemExternaId}).
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/documentos/${documento.id}`} className={botaoClasses("secundario")}>
            Ver documento
          </Link>
          <Link href="/documentos" className={botaoClasses("fantasma")}>
            Acervo
          </Link>
        </div>
      </div>

      <DocumentoForm
        modo="editar"
        valores={valores}
        anos={anos}
        anoAtual={Number(hojeISO().slice(0, 4))}
        responsaveis={responsaveis}
      />
    </div>
  );
}
