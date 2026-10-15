# SICED — Passagem para produção

Guia para colocar o controle de expedientes da **EE PROFA. MARLENE FRATTINI** online com dados reais.

## 1. Banco de dados definitivo

O sistema usa PostgreSQL via Drizzle ORM. Para produção, aponte `DATABASE_URL` para o banco definitivo —
inclusive o **PostgreSQL do próprio Supabase** (mesmo projeto da base oficial ou um projeto dedicado):

```
# conexão direta
DATABASE_URL=postgresql://postgres:SENHA@db.antxvplowlmpbvftch.supabase.co:5432/postgres

# ou via pooler (recomendado em serverless)
DATABASE_URL=postgresql://postgres.atantxvplowlmpbvftch:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

A senha do banco fica em **Supabase → Project Settings → Database → Connection string**.
Nunca versione a `DATABASE_URL` real.

## 2. Criar as tabelas no banco novo

```bash
npx drizzle-kit push        # cria/atualiza documentos, setores, numeracao, configuracoes, sincronizacoes
```

Atenção: o SICED cria uma tabela chamada `documentos`. A base oficial também possui uma tabela `documentos`,
mas em **projeto Supabase diferente**, consultada por API REST. Como o SICED só grava no banco apontado por
`DATABASE_URL` e a base oficial é acessada somente para leitura, não há conflito. Se preferir máximo isolamento,
use um projeto Supabase dedicado ao SICED.

## 3. Variáveis de ambiente obrigatórias

| Variável | Uso |
|---|---|
| `DATABASE_URL` | banco definitivo do SICED |
| `SUPABASE_URL` | base oficial (leitura) |
| `SUPABASE_ANON_KEY` | chave publicável do projeto oficial |
| `SUPABASE_TABELAS` | `documentos,contadores` |
| `HABILITAR_DADOS_DEMO` | **`false`** em produção (bloqueia a carga de teste) |

## 4. Limpar a massa de teste

Antes de começar: **Configurações → Manutenção da base de dados**

1. **Limpar dados de demonstração** — remove os expedientes de teste, unidades sem vínculo, histórico de
   sincronizações e zera os contatos institucionais fictícios; recalcula a numeração usando os contadores da
   base oficial como piso. Os documentos espelhados da base oficial são mantidos.
2. **Limpar tudo (zona de risco)** — remove também os espelhados e zera a numeração, para quem quer começar do
   zero. A base oficial no Supabase não é alterada.

Equivalente por linha de comando:

```bash
curl -X POST https://SEU-DOMINIO/api/admin/manutencao \
  -H 'Content-Type: application/json' \
  -d '{"escopo":"demonstracao","confirmar":true}'
```

Prévia (contagens antes de limpar): `GET /api/admin/manutencao`.

## 5. Configurar a unidade escolar

**Configurações → Dados institucionais**: preencha órgão, unidade emissora, endereço, CEP, telefone, e-mail,
site, responsável e cargo padrão. Esses dados compõem o timbre dos documentos impressos.

Depois, em **Numeração**, confira prefixo, dígitos e último número de cada movimentação/espécie/ano — esses
valores definem o próximo número emitido.

## 6. Importar a base oficial

**Base oficial (Supabase) → Importar** sincroniza os registros reais de forma idempotente (atualiza pelo id de
origem, sem duplicar) e ajusta os contadores de numeração.

## 7. Publicação

```bash
npm run build && npm run start   # ou o provedor (Vercel, etc.)
```

Healthcheck: `GET /api/health` deve responder `{"ok":true}`.

## 8. Checklist de segurança

- [ ] `HABILITAR_DADOS_DEMO=false`
- [ ] Chave `anon` do Supabase rotacionada e com RLS restringindo escrita
- [ ] `DATABASE_URL` de produção somente no cofre de segredos
- [ ] Backups automáticos ativos no banco definitivo
- [ ] Rotina de exportação CSV periódica do acervo (Relatórios → Exportar)
