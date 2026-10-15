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

---

## Erros comuns (e a causa exata)

### "A server error occurred. Reload to try again." ao abrir o site

Esse é o erro genérico do Next.js quando uma exceção não tratada acontece no servidor. **Em 9 de cada 10 casos a
causa é a conexão com o banco no ambiente da Vercel.** As quatro origens mais frequentes:

**1. Variáveis de ambiente não cadastradas na Vercel.**
A Vercel **não lê** os arquivos `.env` do repositório — eles servem apenas para o desenvolvimento local. Se
`DATABASE_URL` não existir no ambiente, o app não tem como abrir o pool.
→ *Project → Settings → Environment Variables* → cadastre `DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_TABELAS` e `HABILITAR_DADOS_DEMO=false` em **Production e Preview** → **Redeploy**
(variáveis só entram no build seguinte).

**2. Arquivo `.env` do repositório sendo usado em produção.**
O Next.js carrega `.env` **também em produção**. Se o arquivo versionado aponta para
`postgresql://postgres:postgres@127.0.0.1:5432/app_db`, o deploy tenta conectar ao "localhost" da função
serverless — que não existe — e a página quebra. O projeto agora tem `.gitignore` ignorando `.env`/`.env.*`, e o
`/diagnostico` avisa quando detecta esse caso (`localhostEmNuvem: true`).
→ Rode `git rm --cached .env`, confirme que `.env` não está no deploy e cadastre as variáveis no painel da Vercel.
Valores do painel **têm precedência** sobre o arquivo `.env`, então cadastrá-los já resolve.

**3. Conexão direta do Supabase (IPv6) — a causa mais traiçoeira.**
O host `db.<ref>.supabase.co` responde **apenas em IPv6** por padrão, e as funções serverless da Vercel não têm
IPv6 → o driver falha com `ENOTFOUND`/`ETIMEDOUT` mesmo com a senha correta.
→ Use o **Connection Pooler** (IPv4):

```
DATABASE_URL=postgresql://postgres.<ref>:<SENHA>@aws-0-<região>.pooler.supabase.com:6543/postgres?pgbouncer=true
```

O valor exato está em *Supabase → Project Settings → Database → Connection pooling → Session/Transaction*.

**4. SSL obrigatório.**
Servidores gerenciados recusam conexão sem TLS. O SICED ativa SSL automaticamente para qualquer host remoto —
basta **não** incluir `?sslmode=disable` na URL.

**5. Tabelas não criadas no banco de produção.**
Se o banco é novo, falta rodar a migração: `relation "documentos" does not exist`.
→ Rode `npx drizzle-kit push` apontando para a URL de produção, ou cole `supabase/schema.sql` no SQL Editor do
Supabase (script idempotente, pode rodar mais de uma vez).

### Como diagnosticar em 30 segundos

1. Abra **`/api/health`** — resposta com o motivo exato:
   ```json
   { "conectado": false, "erro": "getaddrinfo ENOTFOUND db.xxx.supabase.co",
     "dica": "O host é a conexão DIRETA do Supabase (IPv6)..." }
   ```
2. Abra **`/diagnostico`** — mostra host/porta/usuário (sem senha), se o SSL foi ativado, se está passando pelo
   pooler, quais tabelas existem e quais variáveis de ambiente estão definidas.
3. Qualquer tela com erro exibe a causa + as orientações acima, e registra um `digest` para cruzar com os logs
   (*Vercel → Deployments → Functions → Runtime Logs*).

### Ajustes feitos no código justamente para isso

- **Conexão preguiçosa:** antes, a ausência de `DATABASE_URL` lançava exceção no carregamento do módulo e derrubava
  *todas* as rotas antes de qualquer tratamento. Agora a falha só ocorre na primeira consulta, com mensagem clara e
  tratável (a página mostra o diagnóstico em vez de um erro cru).
- **SSL automático** para hosts remotos e **timeouts** de conexão (15s) para o build/render não travar.
- **Pool reutilizado** via `globalThis`, com `max` reduzido em hosts remotos (padrão 3) para não estourar o limite
  do pooler em ambiente serverless.
- **`serverExternalPackages: ["pg"]`** no `next.config.ts`: evita falhas de bundling do driver `pg` na Vercel.
- **`error.tsx` e `global-error.tsx`:** no lugar da tela genérica, aparece a causa e o passo a passo.
- **`/api/health` retorna 503 com diagnóstico** quando o banco está inacessível ou a estrutura está incompleta.

### Checklist de verificação pós-deploy

```bash
curl -s https://SEU-DOMINIO/api/health | python -m json.tool   # espera {"ok": true}
```

- `ok: true` → banco conectado, 7 tabelas criadas, base oficial configurada.
- `ok: false` → leia `banco.erro` e `banco.dica`; a correção está em uma das quatro causas acima.

---

## Caso real resolvido: banco novo do Supabase (Vercel)

Sintoma: deploy na Vercel com a connection string do Supabase configurada, mas a página não carregava.

Diagnóstico: a conexão com o banco **funcionava**, porém o banco estava **vazio (0 tabelas)** — o app conectava e
falhava em `relation "configuracoes" does not exist`. Causa: banco criado no Supabase sem aplicar a migração.

Correção aplicada (uma única vez, por banco):

```bash
# opção 1 — via Drizzle
DATABASE_URL="postgresql://postgres.<ref>:<SENHA>@aws-0-<região>.pooler.supabase.com:5432/postgres" \
  npx drizzle-kit push --config drizzle.prod.config.ts

# opção 2 — via SQL Editor do Supabase: cole supabase/schema.sql e clique em Run
```

Verificação depois de aplicar:

```bash
psql "postgresql://postgres.<ref>:<SENHA>@aws-0-<região>.pooler.supabase.com:5432/postgres" \
  -c "select table_name from information_schema.tables where table_schema='public' order by 1"
```

Esperado: `configuracoes`, `documento_itens`, `documento_movimentos`, `documentos`, `numeracao`, `setores`,
`sincronizacoes` (7 tabelas).

### Qual conexão usar

| Uso | Host / porta | Parâmetro |
|---|---|---|
| **Vercel/serverless (recomendado)** | `aws-0-<região>.pooler.supabase.com:6543` | `?pgbouncer=true` |
| Vercel (também funciona) | `aws-0-<região>.pooler.supabase.com:5432` | — (pooler de sessão) |
| Local (máquina do desenvolvedor) | `db.<ref>.supabase.co:5432` | — |
| Migração/psql (scripts) | pooler 5432 ou conexão direta | — |

Ambas as portas do pooler foram validadas com o app real. O modo **transação (6543)** é preferível em serverless
por consumir menos conexões; o modo sessão (5432) tem limite menor e pode gerar
`Max client connections reached` sob carga.

### Numeração começa em 00001 no banco novo

Banco novo não conhece os contadores oficiais, então a primeira emissão é `OF-00001/2026`. Para continuar a
sequência real, abra **Base oficial (Supabase) → Importar**: a sincronização traz os documentos e ajusta os
contadores (`EXPEDIÇÃO_OFÍCIO_2026 → 79`, etc.), passando o próximo número para `OF-00080/2026`.

---

## Como dar continuidade à numeração (definir o próximo número)

Cada sequência é identificada por **movimentação + espécie + exercício** (ex.: `EXPEDIÇÃO · Ofício · 2026`). Para
continuar de onde o acervo parou, informe o **próximo número que deve ser emitido** — o sistema grava um a menos
como último emitido.

Exemplo: se o próximo Ofício deve ser **80**, informe `80`; o próximo documento sai `OF-00080/2026`.

### Onde alterar (duas portas, mesmo motor)

1. **Ao cadastrar**: *Novo documento* → bloco **“Sequência: próximo Ofício nesta movimentação”** → botão
   **“Alterar sequência (dar continuidade)”** → digite `80` → **Aplicar sequência**. O campo de número do formulário
   já passa a exibir `OF-00080/2026`.
2. **Em lote**: *Numeração e órgão* → coluna **“Definir próximo nº”** → preencha e clique em **Definir**. A tabela
   mostra, por linha: último emitido, maior número existente no acervo, quantos documentos há no grupo e o número
   resultante. O botão **“Igualar ao acervo”** sincroniza todas as sequências com o maior número já lançado.

### API

```bash
# definir o próximo número
curl -X POST https://SEU-DOMINIO/api/numeracao/ajustar \
  -H 'Content-Type: application/json' \
  -d '{"movimentacao":"EXPEDICAO","tipo":"OFICIO","ano":2026,"proximo":80}'

# igualar todas as sequências ao maior número do acervo
curl -X POST https://SEU-DOMINIO/api/numeracao/ajustar \
  -H 'Content-Type: application/json' \
  -d '{"acao":"recalcular","ano":2026}'
```

### Proteções

- Se o número informado **já existir no acervo**, a API responde **409** com o motivo e a interface pede
  confirmação antes de continuar (útil para reemitir documento cancelado).
- O grupo **RECEBIMENTO** recebe prefixo próprio (`R-OF`, `R-PRT`, …) para não colidir com a expedição da mesma
  espécie.
- Cada exercício tem sua própria sequência, reiniciada em 1 de janeiro.

### Valores de partida já aplicados no banco de produção

| Sequência | Último emitido | Próximo |
|---|---|---|
| Expedição · Ofício | 79 | `OF-00080/2026` |
| Expedição · Relação de Remessa | 49 | `RR-00050/2026` |
| Expedição · Protocolo | 9 | `PRT-00010/2026` |
| Expedição · Processo | 76 | `PROC-00077/2026` |
| Expedição · Ofício APM | 1 | `OFAPM-00002/2026` |
| Recebimento · Protocolo | 27 | `R-PRT-00028/2026` |

Ajuste qualquer valor pela tela *Numeração e órgão* conforme a realidade da unidade escolar.
