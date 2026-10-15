import { ResponsaveisManager } from "@/components/ResponsaveisManager";
import { listarResponsaveis } from "@/lib/services/responsaveis";

export const dynamic = "force-dynamic";

export default async function ResponsaveisPage() {
  const responsaveis = await listarResponsaveis();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Responsáveis pela emissão</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cadastre quem assina e responde pelos documentos da unidade escolar. Os responsáveis ativos aparecem na lista
          de seleção ao registrar um expediente e seus dados (cargo, matrícula e lotação) são impressos no bloco de
          assinatura.
        </p>
      </div>

      <ResponsaveisManager
        responsaveis={responsaveis.map((registro) => ({
          id: registro.id,
          nome: registro.nome,
          cargo: registro.cargo,
          matricula: registro.matricula,
          documentoIdentidade: registro.documentoIdentidade,
          email: registro.email,
          telefone: registro.telefone,
          lotacao: registro.lotacao,
          observacoes: registro.observacoes,
          ativo: registro.ativo,
          documentos: registro.documentos,
          ultimaEmissao: registro.ultimaEmissao,
        }))}
      />
    </div>
  );
}
