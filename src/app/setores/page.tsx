import { SetoresManager } from "@/components/SetoresManager";
import { setoresComContagem } from "@/lib/services/documentos";

export const dynamic = "force-dynamic";

export default async function SetoresPage() {
  const setores = await setoresComContagem();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Unidades e órgãos de referência</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cadastro de contatos institucionais da unidade escolar e dos órgãos com os quais ela se comunica. O registro de
          expedientes não exige vínculo de unidade — o campo Interessado identifica a quem o documento se refere.
        </p>
      </div>

      <SetoresManager
        setores={setores.map((setor) => ({
          id: setor.id,
          sigla: setor.sigla,
          nome: setor.nome,
          tipo: setor.tipo,
          responsavel: setor.responsavel,
          cargo: setor.cargo,
          email: setor.email,
          telefone: setor.telefone,
          endereco: setor.endereco,
          cidade: setor.cidade,
          uf: setor.uf,
          ativo: setor.ativo,
          documentos: setor.documentos,
        }))}
      />
    </div>
  );
}
