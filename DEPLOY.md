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

---

## Responsáveis pela emissão de documentos

Cadastro de quem assina e responde pelos expedientes — evita digitação livre e inconsistentes no campo responsável.

### Onde fica

Menu **Responsáveis por emissão** (`/responsaveis`):

| Campo | Uso |
|---|---|
| Nome completo | obrigatório; é a chave de vínculo com os documentos |
| Cargo / função | impresso sob a assinatura |
| Matrícula / RF | impressa junto à assinatura |
| RG / documento | identificação complementar |
| E-mail e telefone | contato institucional |
| Lotação / setor | setor de exercício (aparece na assinatura) |
| Ativo | somente ativos aparecem na seleção de novas emissões |

A listagem mostra **quantas emissões** cada pessoa assinou e a **data da última assinatura**. Botões:
**Importar do acervo** (cria registros a partir dos nomes já usados em documentos, ignorando marcadores
técnicos da sincronização) e **⭳ CSV** (relatório de responsáveis).

### Integração com o cadastro de documentos

No formulário de expediente o campo **Responsável pelo registro** é uma lista dos responsáveis ativos; ao escolher
um nome, o **cargo é preenchido automaticamente**. A opção *“Outro (digitar manualmente)”* mantém o modo texto livre
para casos eventuais.

Na **impressão**, o bloco de assinatura passa a exibir nome, cargo, matrícula/RF e lotação do responsável
selecionado.

### Consistência automática do acervo

Ao alterar o **nome** ou o **cargo** de um responsável, o sistema atualiza também todos os documentos assinados por
ele (a resposta da API informa quantos registros foram sincronizados). Assim o acervo não fica com grafias
divergentes.

### Regras de proteção

- Excluir um responsável que já assinou documentos é **bloqueado (409)** com a orientação de **inativá-lo** — sai das
  novas emissões sem perder o histórico.
- Nome duplicado é **bloqueado (409)**.
- `DELETE /api/responsaveis?id=` (sem histórico) e `DELETE /api/responsaveis/{id}` fazem a validação.

### API

```bash
GET    /api/responsaveis                 # lista com contagem de emissões
POST   /api/responsaveis                 # cadastra
POST   /api/responsaveis {"acao":"importar-do-acervo"}
PUT    /api/responsaveis                 # atualiza ({"sincronizar":false} evita propagar ao acervo)
DELETE /api/responsaveis/{id}
GET    /api/exportar/responsaveis        # CSV
```

### Estrutura no banco

A tabela `responsaveis` foi adicionada (total de **8 tabelas**). Para atualizar bancos existentes, rode
`npx drizzle-kit push --config drizzle.prod.config.ts` ou reexecute `supabase/schema.sql`, que é idempotente.

---

## Documento oficial: Relação de Remessa (duas vias em uma folha)

Ao imprimir um documento do tipo **Relação de Remessa**, o sistema não usa o padrão ofício: gera o formulário
oficial **em duas vias na mesma folha**, separadas por uma linha pontilhada de corte.

### Estrutura de cada via

1. **Timbre** — brasão (ou monograma) + hierarquia institucional + nome da escola + endereço e telefone.
2. **Título** `RELAÇÃO DE REMESSA` centralizado e, à direita, o número no padrão do documento oficial
   (ex.: `041/2026` — sequencial com três dígitos + exercício).
3. **Campos**: `Remetente:` (nome da escola), `Destinatário:` (campo Interessado do cadastro) e
   `Endereço destinatário:` (linha em branco para preenchimento manual).
4. **Tabela** com as colunas do modelo: `Nº item`, `Documento`, `Quantidade (volumes)` e
   `Situação (marque um X)` com as quatro opções — Recebido · Recebido com Ressalva · Recusado · Devolvido.
   Cada item cadastrado ocupa uma linha; o sistema acrescenta linhas em branco (mínimo 6) para preenchimento manual.
5. **Rodapé do formulário**: `Data:` preenchida com a data do documento e `Recebi em ___/___/___`.
6. **Assinaturas**: `Expedido por:` (nome e cargo do responsável pelo registro, com a linha para assinar) e
   `Recebido por: Nome, Cargo, Assinatura e Unidade`.

Cada via é identificada no alto: **1ª via — expedidor** (fica na escola) e **2ª via — recebedor** (volta assinada).

### Configurar o timbre

Em *Numeração e órgão → Dados institucionais*:

| Campo | Exemplo preenchido |
|---|---|
| Órgão | `E.E. PROFA. MARLENE FRATTINI` |
| Sigla | `EEPMF` |
| Unidade emissora | (opcional; pode ficar em branco) |
| **Hierarquia do timbre** | `GOVERNO DO ESTADO DE SÃO PAULO\|SECRETARIA DE ESTADO DA EDUCAÇÃO` |
| Endereço / Cidade / UF / CEP / Telefone | `Av. Aldo Nicolucci, 560 - Jardim São José` · `Matão` · `SP` · `15.996-036` · `3382-6604` |
| **Brasão / logotipo** | `/brasao.png` (arquivo na pasta `public`) ou uma URL completa |

A linha de endereço do timbre é montada automaticamente:
`Av. Aldo Nicolucci, 560 - Jardim São José - Matão - SP CEP 15.996-036 - Tel. 3382-6604`.

Sem valor em **Brasão**, é impresso um monograma circular com a sigla — para usar o brasão oficial, coloque o arquivo
`brasao.png` na pasta `public/` do projeto e informe `/brasao.png` no campo.

### Impressão

Recomendado papel **A4 retrato**, margens normais, sem cabeçalho/rodapé do navegador.
O menu do sistema é ocultado automaticamente na impressão. Os demais tipos de documento (Ofício, Ofício APM,
Protocolo, Processo, Informação) continuam no padrão de ofício com timbre institucional.

---

## Brasão do Estado de São Paulo no timbre

O brasão é impresso no **canto superior esquerdo** dos documentos (Ofício e Relação de Remessa).

### Já vem pronto

O projeto inclui o brasão oficial em `public/brasao-sp.svg` — arte vetorial (370×430, SVG, sem rasterização), do
acervo público do símbolo oficial instituído pela Lei Estadual nº 145/1948 (domínio público, uso permitido em
documentos oficiais). Já está configurado como padrão em `/brasao-sp.svg`.

Onde obter/repor a versão oficial mais recente:

- Governo do Estado: https://www.saopaulo.sp.gov.br/conhecasp/historia/brasao-do-estado-de-sao-paulo/
- Secretaria de Comunicação (identidade visual e papel timbrado): https://www.comunicacao.sp.gov.br/secom/publicidade/materiais/identidade%20visual

### Função de envio (upload) da imagem

*Numeração e órgão → Dados institucionais → **Brasão / logotipo do timbre***:

| Ação | Comportamento |
|---|---|
| **📎 Enviar imagem do brasão** | abre o seletor de arquivos; aceita PNG, JPG, SVG, WEBP e GIF até **1 MB** |
| **Substituir** | troca a imagem atual por outra |
| **Remover imagem** | apaga o envio e volta a usar o arquivo público/URL |
| **Caminho/URL** | alternativa ao upload: `/brasao-sp.svg` (arquivo do projeto) ou `https://...` |
| **Pré-visualização** | mostra exatamente como o brasão sairá na impressão, com a origem em uso |

### Prioridade de uso

1. **Imagem enviada** (guardada no banco de dados — ambientes serverless não permitem gravar em disco);
2. **Arquivo do projeto** informado em *Caminho/URL* (ex.: `/brasao-sp.svg`);
3. **URL externa** (`https://...`);
4. **Monograma** com a sigla, quando não há imagem.

### API

```bash
POST   /api/configuracoes/brasao    # {"arquivo":"data:image/png;base64,...","nomeArquivo":"brasao.png"}
DELETE /api/configuracoes/brasao    # remove a imagem enviada
GET    /api/brasao                  # serve a imagem (com cache por versão)
```

Formatos fora da lista são rejeitados com **422**; imagens acima de 1 MB também. O `GET /api/brasao` responde com
`Cache-Control: immutable` e versão no `ETag`, então trocar o arquivo não deixa imagem antiga em cache.

### Verificação rápida

Abra a tela de impressão de qualquer documento: o brasão deve aparecer no topo à esquerda. Na Relação de Remessa,
ele aparece nas **duas vias**.

---

## Datas, fuso horário e virada de exercício

### O problema que existia (e foi corrigido)

O servidor da Vercel roda em **UTC**. O código antigo calculava "hoje" a partir do fuso do servidor, o que gerava
três defeitos:

| Defeito | Efeito real |
|---|---|
| `hojeISO()` sem fuso explícito | às **21h de 31/12** no Brasil já era 01/01 em UTC → o documento nascia no **exercício seguinte** |
| `formatarDataHora()` sem fuso | histórico de movimentações e sincronizações mostravam **horário 3 horas adiantado** |
| comparação de prazo com data UTC | documento com prazo **hoje** aparecia como **vencido** a partir das 21h |
| série mensal do painel com `Date` | risco de deslocar o mês inicial na aritmética de datas |

### A correção

Toda a lógica de datas foi centralizada em `src/lib/format.ts`, com fuso explícito:

- **`APP_TIMEZONE`** (padrão `America/Sao_Paulo`) define o fuso de "hoje", da hora exibida e dos prazos.
- **`hojeISO()`** usa `Intl.DateTimeFormat('en-CA', { timeZone })` → devolve exatamente `AAAA-MM-DD` no fuso local.
- **`formatarDataHora()`** formata com `timeZone` → 14:06 em Brasília, e não 17:06 UTC.
- **Aritmética de calendário em strings** (`deslocarDias`, `deslocarMeses`, `ultimoDiaDoMes`, `serieDeMeses`): soma de
  dias/meses sem `Date` local, imune a fuso e horário de verão (31/01 + 1 mês = 28/02).
- **`validarDataISO()`** rejeita datas impossíveis (30/02, mês 13).
- O exercício de um documento é **sempre derivado da data do documento** no servidor — não é possível gravar um
  documento de 31/12/2026 no exercício 2027.

### Como funciona a virada de ano

1. **Automático no primeiro documento**: ao registrar um expediente datado de 2027, o sistema cria as sequências de
   2027 na hora e numera a partir de `00001` (`OF-00001/2027`). As sequências de 2026 permanecem intactas.
2. **Antecipado pela tela**: *Numeração e órgão → **Virada de exercício*** → informe o ano (padrão: próximo) →
   **Preparar exercício**. São criadas as 12 combinações (expedição/recebimento × 6 espécies), todas em `00001`.
   A tela mostra quais exercícios já existem e destaca o atual.
3. **Numeração independente por ano**: o índice de unicidade é `movimentacao + tipo + ano + numeroSequencial`, então
   `OF-00080/2026` e `OF-00080/2027` coexistem sem conflito.
4. **Consulta e relatórios**: o filtro por exercício e os relatórios já consideram o ano; o acervo mantém o histórico
   de todos os anos.
5. **Continuidade fora do padrão**: se a escola já emitiu até 95 em 2027, use *Definir próximo nº* = 96 (ou
   *Igualar ao acervo*).

### Verificação rápida

```bash
# "hoje" e a hora no fuso da aplicação
curl -s https://SEU-DOMINIO/api/health | python -m json.tool   # ok: true

# preparar 2027
curl -X POST https://SEU-DOMINIO/api/numeracao -H 'Content-Type: application/json' -d '{"ano":2027}'

# conferir as sequências de 2027
curl -s "https://SEU-DOMINIO/api/documentos/proximo-numero?ano=2027" | python -m json.tool
```

---

---

## Impressão do detalhamento — rota dedicada, A4 econômico

A impressão **não** usa o CSS da tela de relatórios. Existe uma página própria:

```
/relatorios/imprimir?de=2026-05-01&ate=2026-06-30&tipo=OFICIO&movimentacao=EXPEDICAO
```

Ela aceita os mesmos filtros dos relatórios e entrega **somente o detalhamento do período**.

### Por que uma rota dedicada

| Motivo | Efeito prático |
|---|---|
| Nada de painel/gráficos no papel | o conteúdo é só a listagem |
| Busca sem paginação (`pageSize` ignorado) | o PDF leva o período **completo**, não os 20 da tela |
| Cabeçalho em uma faixa | a folha fica quase toda para os registros |
| Abre em nova aba com os filtros na URL | o documento é reproduzível e pode ser enviado por link |

### O que sai no papel

1. **Faixa única de cabeçalho**: brasão (34 px) + nome da unidade + “Detalhamento de Expedientes” + período, filtros aplicados e data/hora de emissão;
2. **Resumo em duas linhas**: `24 documentos · 24 expedições · 0 recebimentos · 24 páginas` e a contagem por espécie;
3. **Tabela**: `#`, `Número`, `Mov.`, `Data`, `Assunto`, `Interessado`, `Nº processo`, `Situação`, `Pág.`, `Anex.` com linha de **totais**;
4. **Rodapé**: unidade/local e contagem de registros.

Não há assinatura nem gráficos — o foco é a listagem.

### Otimizações de papel

- `@page { size: A4 portrait; margin: 10mm 8mm }`;
- fonte de **8,2 px**, entrelinha 1,2 e padding de 1 px;
- **cabeçalho repetido** em cada página (`table-header-group`);
- linhas com `break-inside: avoid` (nenhum registro cortado entre folhas);
- zebra discreta (`#f8fafc`) para leitura sem gastar tinta;
- assunto limitado a 2 linhas para manter a altura constante;
- rodapé fixo na última faixa da página.

Referência: **212 registros ≈ 3 a 4 folhas**.

### Como usar

1. **Relatórios** → aplique período e filtros;
2. clique em **🖨 Imprimir / PDF** (abre a rota dedicada em nova aba);
3. a caixa de impressão abre automaticamente → **Salvar como PDF** ou impressora;
4. o botão *Imprimir / Salvar PDF* dentro da página permite reabrir a caixa; *Voltar aos relatórios* retorna com os filtros preservados.

O **CSV** continua no bloco de filtros para planilha.

### Arquivos

- `src/app/relatorios/imprimir/page.tsx` — documento de impressão (server component);
- `src/components/impressao/TabelaDocumentosImpressao.tsx` — tabela, resumo e totais;
- `src/components/impressao/AutoImprimir.tsx` — abre a caixa de impressão ao carregar;
- `src/components/BotaoImprimirRelatorio.tsx` — link com os filtros atuais;
- `src/app/globals.css` — `.pagina-documento`, `.folha-detalhamento`, `.cabecalho-detalhamento`, `.tabela-impressao`.
