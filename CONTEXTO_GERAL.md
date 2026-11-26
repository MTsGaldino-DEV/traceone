# Contexto Geral: Projeto TraceOne — Controle de Medidores

> **Atualizado em:** 2026-09-23
> **Para que serve este documento:** ponto de entrada único para qualquer desenvolvedor ou IA que vá trabalhar no TraceOne — inclusive para **construir o aplicativo Android** a partir do mesmo backend. Tudo que é necessário para consumir o sistema (credenciais públicas, schema, RPCs, regras de permissão, regras de negócio, identidade visual) está aqui.

---

## Índice

1. [O que é o TraceOne](#1-o-que-é-o-traceone)
2. [Arquitetura](#2-arquitetura)
3. [Conexão com o backend (o que o app Android precisa)](#3-conexão-com-o-backend-o-que-o-app-android-precisa)
4. [Autenticação e sessão](#4-autenticação-e-sessão)
5. [Papéis e permissões](#5-papéis-e-permissões)
6. [Modelo de dados completo](#6-modelo-de-dados-completo)
7. [View, triggers e automatismos do banco](#7-view-triggers-e-automatismos-do-banco)
8. [Catálogo de RPCs](#8-catálogo-de-rpcs)
9. [Telas e fluxos](#9-telas-e-fluxos)
10. [Regras de negócio](#10-regras-de-negócio)
11. [Armadilhas conhecidas](#11-armadilhas-conhecidas)
12. [Identidade visual](#12-identidade-visual)
13. [Guia para o app Android](#13-guia-para-o-app-android)
14. [Ambiente, deploy e scripts](#14-ambiente-deploy-e-scripts)
15. [Histórico de decisões relevantes](#15-histórico-de-decisões-relevantes)
16. [Próximos passos](#16-próximos-passos)

---

## 1. O que é o TraceOne

Sistema interno de rastreamento de medidores de energia elétrica, usado por uma empresa contratada de concessionária de energia. O fluxo central é:

1. Medidores são **entregues fisicamente** a técnicos de campo (colaboradores) — isso vira uma linha `PENDENTE` em `medidores_list`.
2. O técnico instala o medidor e executa um serviço registrado no **GDIS** (sistema web interno do cliente, rodando em rede local) / SAP.
3. O TraceOne **cruza** os medidores entregues com os serviços executados e garante que nenhum medidor fique sem baixa. Quando o serviço é vinculado ao serial, o medidor vira `CONCLUIDO`.
4. O que fica pendente por muito tempo (+45 dias) vira cobrança/risco financeiro — daí as telas de conferência e os KPIs em R$.

**Público-alvo:** gestores operacionais, supervisores, almoxarifado e despachantes.
**Uso:** diário, decisões rápidas sobre reatribuições e pendências financeiras.

### Glossário de domínio

| Termo | Significado |
|---|---|
| **Serial** | Número de série gravado no medidor físico. É a chave prática do rastreio. |
| **Material SAP / cod_sap** | Código do material no SAP, identifica o modelo do equipamento (`tipos_de_medidores.cod_sap`). Define o valor em R$. |
| **Matrícula** | Identificador do colaborador (ex.: `e253433`). **Sempre normalizada para minúsculo** por trigger no banco. Matrícula que começa com `C` é de terceiro e não entra no cadastro. |
| **GDIS** | Sistema do cliente onde o serviço executado é registrado. Cada serviço tem um número (`servicos_report.servico`). |
| **Serviço GDIS** | Número do serviço que dá baixa no medidor. |
| **GC / GO** | Gerência de Campo / Gerência Operacional — agrupamentos hierárquicos do colaborador. |
| **Supervisor** | Campo texto em `colaboradores` (não é FK para usuário do sistema). |
| **TC / Chave de aferição** | Outros equipamentos do catálogo, além dos medidores. Ficam **de fora** da detecção de duplicidade (podem dividir serviço com o medidor legitimamente). |
| **Planilha Juliana** | Exportação semanal do SAP com o estado atual dos medidores em campo, usada para sincronizar o banco. |
| **Planilha PC** | Planilha de serviços concluídos, importada para vincular medidor ↔ serviço em lote. |

---

## 2. Arquitetura

```
┌──────────────────┐        ┌──────────────────────────────┐
│  Frontend web    │        │  Supabase (PostgreSQL)       │
│  Next.js 16      │◄──────►│  - Tabelas + View            │
│  (Docker :3000)  │  HTTPS │  - RLS por role              │
└────────┬─────────┘        │  - RPCs (regras de negócio)  │
         │                  │  - Auth (GoTrue)             │
         │ service_role     └──────────────────────────────┘
         │ (só server-side)                ▲
┌────────▼─────────┐                       │ mesma API REST/PostgREST
│ /api/users       │                       │
│ (Route Handlers) │        ┌──────────────┴───────────────┐
└──────────────────┘        │  App Android (a construir)   │
                            │  supabase-kt                 │
┌──────────────────┐        └──────────────────────────────┘
│ Conector local   │
│ Node + Playwright│  só desktop, rede interna
│ localhost:3334   │──► GDIS (192.168.122.110)
└──────────────────┘
```

**Ponto-chave para o Android:** quase toda a lógica de negócio mora **no banco** (RPCs + triggers + RLS), não no frontend. O app Android fala direto com o Supabase e herda as mesmas regras, sem precisar de backend próprio. A única exceção é a gestão de usuários (criar/editar/excluir), que passa pelas rotas `/api/users` do Next.js porque exige a `service_role key`.

### Stack atual (web)

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16.2 (App Router), React 19, Tailwind CSS v4 |
| Gráficos | Componentes vendorizados do Bklit UI (`@visx`, `motion`, `@number-flow/react`) — Recharts foi removido |
| Ícones | Lucide React |
| Planilhas | `xlsx` (lê `.xlsx` e `.csv` no browser) |
| Backend / DB | Supabase (PostgreSQL) — Triggers, View, RPCs, RLS |
| Auth | Supabase Auth (GoTrue), e-mail + senha |
| Deploy | Docker (`docker compose build && up -d`), porta 3000 |

> `frontend/AGENTS.md` avisa: esta versão do Next.js tem breaking changes em relação ao conhecimento comum — consultar `node_modules/next/dist/docs/` antes de escrever código de framework.

---

## 3. Conexão com o backend (o que o app Android precisa)

### Credenciais

```
NEXT_PUBLIC_SUPABASE_URL  = https://ctlaygzndbaojxpwqsco.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bGF5Z3puZGJhb2p4cHdxc2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTMwNDcsImV4cCI6MjEwMDgyOTA0N30.tEVFvFN9LP1m9fYp3DFh2xJYarlkiqo6kICFgl0AWL8
```

- A **anon key é pública por natureza** (vai embutida no bundle web e pode ir no app Android). Toda a proteção real vem da RLS, que avalia o JWT do usuário logado.
- A **`SUPABASE_SERVICE_ROLE_KEY` nunca pode ir para o app**. Ela só existe em variável de ambiente do container e é usada exclusivamente nos route handlers `frontend/app/api/users/*`.
- Endpoints derivados: REST/PostgREST em `<url>/rest/v1/`, Auth em `<url>/auth/v1/`, RPC em `<url>/rest/v1/rpc/<nome>`.

### SDK sugerido no Android

`supabase-kt` (`io.github.jan-tennert.supabase`), módulos `postgrest-kt` + `auth-kt`. Equivalências diretas com o que o web usa:

| Web (`supabase-js`) | Android (`supabase-kt`) |
|---|---|
| `supabase.from('x').select()` | `postgrest.from("x").select()` |
| `supabase.rpc('nome', params)` | `postgrest.rpc("nome", params)` |
| `supabase.auth.signInWithPassword` | `auth.signInWith(Email)` |
| `.range(from, to)` | `Count`/`Range` no `select { range(...) }` |

### Gestão de usuários pelo app (opcional)

Se o app precisar criar/editar/excluir usuários, ele **não** faz isso via Supabase direto — chama o host do web app:

- `GET /api/users` — lista perfis + e-mails
- `POST /api/users` — `{ name, email, role }`, cria com senha padrão `123456` e `email_confirm: true`
- `PATCH /api/users/{id}` — `{ name?, email?, role?, is_active? }`
- `DELETE /api/users/{id}`

Todas exigem header `Authorization: Bearer <access_token>` do usuário logado; o guard `requireManager()` (`frontend/lib/api-auth.ts`) valida que o chamador é `ADMIN`, `GESTOR` ou `SUPERVISOR`.

---

## 4. Autenticação e sessão

- **Login:** e-mail + senha (`signInWithPassword`). Não há OAuth/social login.
- **Perfil:** após o login, ler `profiles` filtrando por `id = auth.uid()` para obter `name`, `role` e `is_active`. O `role` determina todo o resto (menu, botões, o que o banco aceita).
- **Criação de usuário:** só por quem gerencia usuários. O usuário novo nasce com **senha temporária `123456`** (constante `DEFAULT_PASSWORD` em `frontend/lib/permissions.ts`). O admin nunca conhece a senha definitiva de ninguém.
- **Primeiro acesso:** o usuário entra com a senha temporária → é levado a `/reset-senha` → define a senha definitiva com `updateUser({ password })` → é deslogado e volta ao login.
- **Esqueci minha senha:** `resetPasswordForEmail(email, { redirectTo: <origin>/reset-senha })`.
- **Trocar a própria senha logado:** reautentica com `signInWithPassword` (valida a senha atual) e então `updateUser({ password })`. Sem service role.
- **Expiração/logout:** o web escuta `onAuthStateChange` e redireciona para `/login` quando a sessão cai. No Android, o `supabase-kt` já persiste e renova a sessão — basta observar o `SessionStatus`.

> Existiu um fluxo anterior por convite de e-mail (`inviteUserByEmail`). Foi **substituído a pedido explícito do dono do projeto** pela senha padrão. Não reintroduzir sem confirmar.

---

## 5. Papéis e permissões

`role_type` (enum): `ADMIN` · `GESTOR` · `SUPERVISOR` · `ALMOXARIFADO` · `ALMOXARIFADO_211` · `DESPACHANTE`

- **Almoxarifado 211** (`ALMOXARIFADO_211`): almoxarifado que também vincula e importa serviço — braço direito do Gestor.
- **Almoxarifado**: reatribui medidores e vincula serviço pelas telas, mas **não importa** (relatório GDIS, planilhas PC/TC/Lucas) — migration `047`.
- **Supervisor**: reatribui medidores, **não vincula serviço**.
- **Gestor**: tudo, inclusive Backup, Automação GDIS e Log de auditoria.

"Vincular serviço" = gravar número de serviço GDIS num medidor pelas telas: Conferência, Conferência +45 dias, campo Serviço na Lista, Substituir nº do serviço na Duplicidade. "Importar serviço" = importação do relatório GDIS e das planilhas PC/TC/Lucas (permissão separada, mais restrita). **Desvincular** (limpar o serviço) continua liberado para quem escreve.

### Matriz de acesso

| Capacidade | ADMIN | GESTOR | ALMOX. 211 | SUPERVISOR | ALMOXARIFADO | DESPACHANTE |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Ler todas as tabelas operacionais | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Escrever em `medidores_list`, `colaboradores`, `tipos_de_medidores` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Lançar / reatribuir medidor, substituir nº do medidor | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Vincular serviço** (alterar/excluir em `servicos_report`) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Importar serviço** (GDIS, PC/TC/Lucas; inserir em `servicos_report`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Forçar importação GDIS com matrícula não cadastrada | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gerenciar usuários (`profiles`, `/api/users`) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Gestão de colaboradores (tela) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Backup, Automação GDIS, Log de auditoria | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ocultar item da Conferência +45 dias / marcar duplicidade revisada | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

Helpers no código (`frontend/lib/permissions.ts`): `canWrite`, `canVincularServico`, `canImportarServico`, `canGestao`, `canManageUsers`, `canManageColaboradores`, `canForcarImportacao`, `roleLabels`, `assignableRoles` (não é possível atribuir `ADMIN` pela tela). No banco: `pode_escrever()`, `pode_vincular_servico()` (migration `045`, ampliada na `047`) e `pode_importar_servico()` (`047`).

### Como isso é imposto

- **RLS** em todas as tabelas, usando a função `get_user_role()` (`SECURITY DEFINER`, lê `profiles` por `auth.uid()`).
- Leitura liberada para qualquer `authenticated`; escrita restrita por role.
- Algumas RPCs são `SECURITY DEFINER` (ignoram RLS) e por isso **checam a role explicitamente lá dentro** — ex.: `importar_servicos_forcado`, `garantir_servico_report`, `resolver_recuperacao_pendente`. Esconder botão na tela nunca é suficiente.
- **Trava de vínculo no banco:** o trigger `trg_trava_vinculo_servico` (BEFORE INSERT/UPDATE OF `servico_gdis` em `medidores_list`) recusa gravar serviço para quem não pode vincular, com erro `TO403`. Vale para qualquer caminho (tela, RPC, importação). Exceções: sem usuário logado (scripts com `service_role`) e a vinculação automática do lançamento, que marca a transação com `set_config('traceone.vinculo_automatico','on', true)`.
- O `DESPACHANTE` só enxerga a Lista de Medidores; o layout redireciona para `/dashboard` se ele tentar outra rota.

> Histórico importante: existiam policies `allow_all_*` (nunca versionadas) que liberavam leitura/escrita total a `public`, inclusive sem login, nas 4 tabelas operacionais. Foram removidas na migration `019`. Se algo parecer "permissivo demais" no banco, conferir `pg_policies` antes de assumir.

---

## 6. Modelo de dados completo

### Enums e domínios

| Nome | Valores | Observação |
|---|---|---|
| `role_type` (enum) | `ADMIN`, `GESTOR`, `SUPERVISOR`, `ALMOXARIFADO`, `ALMOXARIFADO_211`, `DESPACHANTE` | `ALMOXARIFE` foi renomeado para `ALMOXARIFADO`; `ALMOXARIFADO_211` entrou na `044` |
| `status_medidor` (enum) | `PENDENTE`, `CONCLUIDO`, `REATRIBUIDO` | `REATRIBUIDO` é linha histórica, some da view |
| `status_conferencia` | `PENDENTE`, `CONFERIDO`, `AGUARDANDO_VINCULACAO` | **Não é enum** — é `TEXT` com CHECK constraint em `servicos_report` |

### `profiles` — usuários do sistema

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `name` | TEXT NOT NULL | |
| `role` | `role_type` NOT NULL | default `ALMOXARIFADO` |
| `is_active` | BOOLEAN NOT NULL | default `true` |
| `created_at` / `updated_at` | TIMESTAMPTZ | `updated_at` por trigger |

### `tipos_de_medidores` — catálogo de equipamentos

| Coluna | Tipo | Notas |
|---|---|---|
| `cod_sap` | TEXT PK | código do material no SAP |
| `tipo` | TEXT NOT NULL | descrição; `ILIKE 'MEDID%'` distingue medidor de TC/chave |
| `ligacao` | TEXT NOT NULL | CHECK `('direto','indireto')` |
| `valor` | NUMERIC(10,2) NOT NULL | **fonte de toda métrica em R$** |
| `ativo` | BOOLEAN NOT NULL | default `true` |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `colaboradores` — técnicos de campo

| Coluna | Tipo | Notas |
|---|---|---|
| `matricula` | TEXT PK | normalizada para **minúsculo** por trigger |
| `nome` | TEXT NOT NULL | |
| `supervisor` | TEXT | texto livre |
| `gc` | TEXT | Gerência de Campo |
| `go` | TEXT | Gerência Operacional |
| `ativo` | BOOLEAN NOT NULL | default `true` |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

> Não pode ser excluído se tiver medidores/serviços vinculados (FK 23503) — a UI orienta a marcar como inativo.

### `medidores_list` — tabela principal

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `data` | DATE NOT NULL | data de atribuição (entrega ao técnico) |
| `material_sap` | TEXT NOT NULL | FK → `tipos_de_medidores(cod_sap)` |
| `serial` | TEXT NOT NULL | |
| `matricula` | TEXT NOT NULL | FK → `colaboradores(matricula)`; normalizada |
| `servico_gdis` | TEXT | FK → `servicos_report(servico)`, sem ON DELETE |
| `status` | `status_medidor` NOT NULL | default `PENDENTE` |
| `data_conclusao` | DATE | |
| `servico_campo` | TEXT | |
| `equipe` | TEXT | |
| `reatribuido_de_id` | UUID | FK → `medidores_list(id)` — trilha de auditoria |
| `reatribuido_para_id` | UUID | FK → `medidores_list(id)` |
| `data_reatribuicao` | TIMESTAMPTZ | |
| `atualizacao` | TIMESTAMPTZ NOT NULL | atualizada por trigger em todo UPDATE |
| `created_at` | TIMESTAMPTZ NOT NULL | |

**Índice crítico:** `idx_medidor_serial_pendente_unico` — `UNIQUE (serial) WHERE status = 'PENDENTE'`. Ou seja: **um serial só pode ter uma linha PENDENTE no sistema inteiro**. É o que dispara o fluxo de reatribuição.

### `servicos_report` — serviços importados do GDIS

| Coluna | Tipo | Notas |
|---|---|---|
| `servico` | TEXT PK | número do serviço GDIS |
| `matricula` | TEXT | FK → `colaboradores`; NULL quando terceiro/forçado |
| `termino` | TIMESTAMPTZ NOT NULL | data de término do serviço |
| `cod_serv` | TEXT | |
| `tipo_serv` | TEXT | |
| `imported_at` | TIMESTAMPTZ NOT NULL | |
| `status_conferencia` | TEXT NOT NULL | default `PENDENTE`; CHECK dos 3 valores |
| `medidor_serial_vinculado` | TEXT | preenchido ao conferir |
| `conferido_em` | TIMESTAMPTZ | |
| `serial_buscado` | TEXT | serial informado quando o medidor ainda não existia |

Índice parcial `idx_servicos_conferencia_serial` em `(status_conferencia, serial_buscado)` para os `AGUARDANDO_VINCULACAO`.

### `medidor_logs` — linha do tempo por medidor

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `medidor_id` | UUID NOT NULL | FK → `medidores_list(id)` **ON DELETE CASCADE** |
| `evento` | TEXT NOT NULL | `CADASTRADO`, `CONCLUIDO`, `SERVICO_VINCULADO`, `SERVICO_REMOVIDO`, `REABERTO`, `REATRIBUIDO`, `EDITADO` |
| `descricao` | TEXT | |
| `created_at` | TIMESTAMPTZ NOT NULL | |

Leitura e inserção liberadas a qualquer `authenticated`. Preenchida pelo trigger `trg_log_medidor_evento`.

### `conferencia_45dias_ocultos` — itens escondidos da conferência +45 dias

| Coluna | Tipo | Notas |
|---|---|---|
| `medidor_id` | UUID PK | FK → `medidores_list` CASCADE |
| `ocultado_por` | UUID | FK → `profiles`, default `auth.uid()` |
| `ocultado_em` | TIMESTAMPTZ NOT NULL | |

Ocultar é **coletivo e persistente**: todo mundo vê a mesma lista.

### `duplicidade_revisados` — log de grupos já revisados

| Coluna | Tipo | Notas |
|---|---|---|
| `tipo` | TEXT | PK composta; CHECK `('SERVICO','SERIAL')` |
| `chave` | TEXT | PK composta; o serviço ou o serial que define o grupo |
| `itens_conflitantes` | JSONB NOT NULL | snapshot do momento da revisão |
| `revisado_por` | UUID | FK → `profiles`, default `auth.uid()` |
| `revisado_em` | TIMESTAMPTZ NOT NULL | |

### `medidor_recuperacao_pendente` — resíduo do incidente de 2026-09-16 (ADMIN e GESTOR; a aba saiu, a Automação GDIS ainda usa)

| Coluna | Tipo | Notas |
|---|---|---|
| `medidor_id` | UUID PK | FK → `medidores_list` CASCADE |
| `tipo` | TEXT NOT NULL | CHECK `('SEM_SERIAL','AMBIGUO')` |
| `candidatos_serial` | JSONB | candidatos encontrados no cruzamento de fontes |
| `criado_em` | TIMESTAMPTZ NOT NULL | |

### `automacao_gdis_log` — histórico das rodadas da Automação GDIS (ADMIN e GESTOR)

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `execucao_id` | UUID NOT NULL | identifica a rodada |
| `chave_item` | TEXT NOT NULL | `rec:<medidorId>` ou `conf:<servico>` |
| `origem` | TEXT NOT NULL | CHECK `('RECUPERACAO','CONFERENCIA')` |
| `medidor_id` | UUID | **sem FK** e opcional (item de conferência ainda não tem medidor) |
| `servico_gdis`, `matricula`, `colaborador`, `tipo_equipamento` | TEXT | desnormalizados de propósito |
| `serial_anterior`, `serial_encontrado` | TEXT | |
| `resultado` | TEXT NOT NULL | `ENCONTRADO`, `GRAVADO`, `CONFLITO`, `VAZIO`, `ERRO`, `AGUARDANDO` |
| `observacao` | TEXT | |
| `modo` | TEXT NOT NULL | `AUTOMATICO` \| `MANUAL` |
| `executado_por` | UUID | FK → `profiles`, default `auth.uid()` |
| `criado_em` / `atualizado_em` | TIMESTAMPTZ | |

`UNIQUE (execucao_id, chave_item)` — a linha **evolui** (upsert) de `ENCONTRADO` para `GRAVADO`/`CONFLITO`/`AGUARDANDO` em vez de virar duas.

### `auditoria_log` — log de auditoria (leitura só ADMIN e GESTOR; imutável)

Gravado pelo trigger `trg_auditoria` → `fn_auditoria()` em `medidores_list`, `servicos_report`, `colaboradores`, `profiles`, `tipos_de_medidores`, `conferencia_45dias_ocultos` e `duplicidade_revisados`. O cliente não grava, altera nem apaga (sem policy de escrita e `REVOKE`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | BIGINT identity PK | |
| `criado_em` | TIMESTAMPTZ NOT NULL | |
| `usuario_id`, `usuario_nome`, `usuario_papel` | UUID / TEXT | **sem FK**: o registro sobrevive à exclusão do usuário |
| `origem` | TEXT NOT NULL | `USUARIO`, `AUTOMATICO` (vinculação automática do lançamento), `SISTEMA` (sem login) |
| `tabela` | TEXT | tabela afetada; NULL em `ACESSO_NEGADO` |
| `operacao` | TEXT NOT NULL | `INSERT`, `UPDATE`, `DELETE`, `NEGADO` |
| `evento` | TEXT NOT NULL | ex.: `SERVICO_VINCULADO`, `SERVICO_SUBSTITUIDO`, `SERVICO_DESVINCULADO`, `SERIAL_SUBSTITUIDO`, `MEDIDOR_REATRIBUIDO`, `MEDIDOR_EXCLUIDO`, `CONFERENCIA_<status>`, `PAPEL_ALTERADO`, `ACESSO_NEGADO` |
| `registro_id`, `chave` | TEXT | id da linha e o que a identifica (serial, serviço, matrícula, nome) |
| `busca` | TEXT | identificadores em minúsculo, para busca parcial |
| `antes`, `depois` | JSONB | UPDATE: só os campos alterados; INSERT/DELETE: linha inteira |

UPDATE que não muda nada não gera linha. Tentativas recusadas por permissão são desfeitas junto com a transação, então o front as registra à parte pela RPC `registrar_acesso_negado` (evento `ACESSO_NEGADO`).

### Tabelas de backup

`backup_medidores_2025_excluidos` e `backup_medidor_logs_2025_excluidos` (migration `037`) guardam o que foi apagado na limpeza de medidores de 2025 cancelados.

---

## 7. View, triggers e automatismos do banco

### `vw_medidores_completo`

Junta `medidores_list` + `colaboradores` + `tipos_de_medidores`, **excluindo `status = 'REATRIBUIDO'`**. Colunas expostas com nomes em PT (atenção: acentos e espaços — no PostgREST precisam de aspas):

| Coluna da view | Origem |
|---|---|
| `id` | `ml.id` |
| `"Data"` | data de atribuição |
| `"Material SAP"` | `ml.material_sap` |
| `"Serial"` | `ml.serial` |
| `"MATRICULA"` | `ml.matricula` |
| `"COLABORADOR"` | `c.nome` |
| `"SUPERVISOR"` | `c.supervisor` |
| `"SERVIÇO GDIS"` | `ml.servico_gdis` |
| `"Concluído/Pendente"` | `ml.status` |
| `"VALOR"` | `t.valor` |
| `"EQUIPAMENTO"` | `t.tipo` |
| `"DIAS DE ATRIBUIÇÃO"` | `COALESCE(data_conclusao, CURRENT_DATE) - data` |
| `"Data da conclusão"` | `ml.data_conclusao` |
| `"ATUALIZAÇÃO"` | `ml.atualizacao` |
| `"SERVIÇO CAMPO"`, `"EQUIPE"` | campos livres |
| `reatribuido_de_id`, `reatribuido_para_id`, `data_reatribuicao` | auditoria |

### Triggers

| Trigger | Tabela | O que faz |
|---|---|---|
| `on_auth_user_created` → `handle_new_user()` | `auth.users` | cria a linha em `profiles` (nome do metadata ou parte do e-mail; role do metadata ou `ALMOXARIFADO`) |
| `trg_normalize_matricula_*` → `normalize_matricula()` | `colaboradores`, `servicos_report`, `medidores_list` | força `lower(matricula)` em INSERT/UPDATE |
| `update_*_updated_at` | `profiles`, `tipos_de_medidores`, `colaboradores` | `updated_at = now()` |
| `trg_touch_atualizacao` | `medidores_list` | `atualizacao = now()` em UPDATE |
| `trg_auto_vincular_serial` | `medidores_list` AFTER INSERT | se o novo medidor é `PENDENTE` e existe serviço `AGUARDANDO_VINCULACAO` com aquele `serial_buscado`, vincula sozinho (mais antigo primeiro) |
| `trg_log_medidor_evento` → `fn_log_medidor_evento()` | `medidores_list` | grava a linha do tempo em `medidor_logs` |
| `trg_trava_vinculo_servico` → `fn_trava_vinculo_servico()` | `medidores_list` BEFORE INSERT/UPDATE OF `servico_gdis` | recusa (`TO403`) gravar serviço sem permissão de vínculo |
| `trg_auditoria` → `fn_auditoria()` | 7 tabelas operacionais | grava `auditoria_log` |

> **Regra de ouro para qualquer função `SECURITY DEFINER` nova:** declarar `SET search_path = public`. Uma função `SECURITY DEFINER` sem isso herda o `search_path` de quem chama — foi exatamente o bug que impedia a criação de qualquer usuário (o GoTrue chama como `supabase_auth_admin`, cujo `search_path` é só `auth`).

---

## 8. Catálogo de RPCs

Todas chamadas via `POST /rest/v1/rpc/<nome>`. Em Kotlin: `postgrest.rpc("nome", buildJsonObject { ... })`.

### Vinculação e conferência

| RPC | Parâmetros | Retorno | Notas |
|---|---|---|---|
| `vincular_servico_medidor` | `p_servico_id TEXT`, `p_serial TEXT` | JSONB `{ ok, aguardando?, serial?, matricula?, nome?, error? }` | Se achou medidor `PENDENTE` com o serial → vincula e marca `CONCLUIDO`. Se não achou → serviço vai para `AGUARDANDO_VINCULACAO` guardando `serial_buscado`. |
| `_tentar_vincular_serial` | `p_servico_id`, `p_serial` | BOOLEAN | Interna, usada pela RPC acima e pelo trigger. |
| `verificar_vinculacoes_pendentes` | — | INT | Tenta resolver em lote todos os `AGUARDANDO_VINCULACAO`; devolve quantos vinculou. |
| `garantir_servico_report` | `p_servico TEXT`, `p_serial TEXT = NULL` | VOID | Cria o serviço se não existir e o marca `CONFERIDO`; limpa `serial_buscado`. Permite vincular um GDIS que ainda não foi importado. Checa role. |
| `match_medidores` | — | TABLE(`medidor_id`, `candidatos`) | Conciliação automática por matrícula + intervalo de data. Ambiguidade volta para resolução manual. |

### Anti-duplicidade e reatribuição

| RPC | Parâmetros | Retorno | Notas |
|---|---|---|---|
| `verificar_medidor_atribuido` | `p_serial TEXT` | TABLE(`medidor_list_id`, `matricula_atual`, `nome_colaborador`, `data_atribuicao`, `dias_atribuido`) | Vazio = serial livre. |
| `reatribuir_medidor` | `p_serial`, `p_nova_matricula`, `p_sap_material_id` | UUID (novo medidor) | Marca o registro anterior como `REATRIBUIDO` e cria o novo, ligando por `reatribuido_de_id`. |
| `get_duplicidade_medidores` | — | JSONB[] | Grupos ativos, `tipo` = `SERVICO` (um serviço com mais de um serial) ou `SERIAL` (mesmo serial em mais de uma linha). Ignora TC/chave e linhas `REATRIBUIDO`. |
| `get_duplicidade_revisados` | — | JSONB[] | Log do que já foi revisado. |
| `marcar_duplicidade_revisado` | `p_tipo`, `p_chave` | VOID | Grava o snapshot dos itens em conflito. |
| `excluir_medidor_duplicado` | `p_id UUID` | INT (linhas restantes) | **Destrutivo**: leva os `medidor_logs` junto por CASCADE. Recusa se for a única linha daquele serial. |
| `substituir_serial_medidor` | `p_id UUID`, `p_serial TEXT` | VOID | Troca o serial da linha (quem escreve). Recusa com `TO409` se o serial novo já estiver `PENDENTE` em outra linha e a linha for `PENDENTE`. Atualiza `servicos_report.medidor_serial_vinculado`. |
| `substituir_servico_medidor` | `p_id UUID`, `p_servico TEXT` | VOID | Troca ou grava o serviço da linha (só quem vincula). `PENDENTE` vira `CONCLUIDO`. O serviço antigo, se veio do GDIS e ficou sem medidor, volta para `PENDENTE` na Conferência. |

### Métricas e listas

| RPC | Parâmetros | Retorno |
|---|---|---|
| `get_medidores_metrics` | `p_matriculas TEXT[]`, `p_status TEXT[]`, `p_servico_gdis TEXT`, `p_serial TEXT`, `p_atribuicao_inicio DATE`, `p_atribuicao_fim DATE`, `p_conclusao_inicio DATE`, `p_conclusao_fim DATE`, `p_material_sap_codes TEXT[]`, `p_supervisores TEXT[]`, `p_dias_min INT` (todos default NULL) | JSON `{ metrics: { total, pendentes, concluidos, valor_pendente, valor_concluido, valor_total, media_dias_pendentes, acima_45 }, ranking: [{ matricula, nome, qtd_pendente, valor_pendente }] }` |
| `get_conferencia_45dias` | `p_page INT=1`, `p_page_size INT=100`, `p_asc BOOLEAN=false`, `p_dias INT=45`, `p_serial TEXT=NULL` | JSONB `{ data: [...], total }` — já exclui os ocultados |
| `get_conferencia_45dias_ocultos` | `p_dias INT=45` | JSONB[] com `ocultadoPor`, `ocultadoEm` |
| `get_ranking_colaboradores` | filtros similares | JSON — existe no banco, **sem call site no frontend atual** |

### Importações

| RPC | Parâmetros | Retorno | Notas |
|---|---|---|---|
| `importar_planilha_pc` | `p_itens JSONB` (lotes de 500) | JSONB `{ servicos_criados, medidores_atualizados, servicos_conferidos }` | Cria os serviços faltantes antes de vincular, satisfazendo a FK. |
| `importar_servicos_forcado` | `p_itens JSONB` | INT (importados) | Importa ignorando matrícula não cadastrada (entra sem matrícula). Só `ADMIN`/`GESTOR`/`ALMOXARIFADO_211` — checado dentro da função. |

`importar_planilha_pc` e `importar_planilha_lucas` também gravam serviço: só `ADMIN`/`GESTOR`/`ALMOXARIFADO_211`.

### Recuperação e automação (ADMIN e GESTOR)

| RPC | Parâmetros | Retorno |
|---|---|---|
| `get_recuperacao_pendente` | — | JSONB[] `{ medidorId, tipo, candidatosSerial, serialAtual, matricula, colaborador, materialSap, tipoEquipamento, servicoGdis, status, data, criadoEm }` |
| `resolver_recuperacao_pendente` | `p_medidor_id UUID`, `p_serial_correto TEXT` | BOOLEAN (`true` = o serial já existia em outra linha; grava mesmo assim) |
| `get_automacao_execucoes` | — | JSONB[] com totais por rodada |
| `get_automacao_execucao_itens` | `p_execucao_id UUID` | JSONB[] com as linhas da rodada |
| `get_user_role` | — | `role_type` — base de toda RLS |
| `pode_escrever` / `pode_vincular_servico` | — | BOOLEAN — papéis que escrevem / que vinculam serviço |
| `registrar_acesso_negado` | `p_acao TEXT`, `p_detalhe TEXT` | VOID — grava `ACESSO_NEGADO` no log de auditoria |

### Códigos de erro próprios

As funções novas levantam erros com SQLSTATE próprio. `message` é o título curto e `details` é a explicação, prontos para mostrar ao usuário (o web traduz em `frontend/lib/erros.ts`; o Android deve fazer o mesmo):

| Código | Significado |
|---|---|
| `TO403` | sem permissão (ex.: vincular serviço sem ser Gestor/Almox. 211/Admin) |
| `TO404` | registro não encontrado (tela desatualizada) |
| `TO409` | conflito (ex.: serial já pendente em outra linha) |
| `TO422` | dado inválido (ex.: número vazio) |

Erros do Postgres que o web também traduz: `23505` com `idx_medidor_serial_pendente_unico` → "Serial já pendente em outra linha" (bloqueio proposital: um serial só pode ter uma linha PENDENTE); `23503` em `medidores_list_servico_gdis_fkey` → "Serviço não encontrado"; `23503` em DELETE → "Registro em uso"; `42501`/RLS → "Sem permissão".

---

## 9. Telas e fluxos

Rotas atuais do web:

```
/login                                   — autenticação + "Primeiro acesso" + "Esqueci minha senha"
/register                                — cadastro
/reset-senha                             — define senha definitiva (3 fluxos convergem aqui)

/(dashboard)/layout.tsx                  — sidebar + proteção de rota por role + trocar senha

/dashboard                               — ★ Lista de Medidores (principal)
/dashboard/lancamento                    — lançamento manual de medidores
/dashboard/importacao                    — importação de planilhas (abas)
/dashboard/conferencia                   — conferência de serviços GDIS (só quem vincula serviço)
/dashboard/conferencia-45dias            — pendências críticas (+45 dias)
/dashboard/duplicidade                   — grupos duplicados (serviço ou serial)
/dashboard/colaboradores                 — CRUD de colaboradores (supervisor+)
/dashboard/usuarios                      — CRUD de usuários do sistema (supervisor+)
/dashboard/automacao-gdis                — robô de consulta ao GDIS (ADMIN e GESTOR, desktop)
/dashboard/backup                        — backup completo em JSON (ADMIN e GESTOR)
/dashboard/auditoria                     — log de auditoria (ADMIN e GESTOR; fora do menu,
                                           abre clicando no nome do usuário na barra lateral)
```

### 9.1 Lista de Medidores (`/dashboard`) — tela principal

**Dashboard de métricas** (tudo vem de `get_medidores_metrics`, uma chamada só):
- KPI cards: Valor Pendente (R$) · Valor Concluído (R$) · Valor Total (R$) · +45 Dias Pendente (alerta vermelho) · Média de Dias.
- Donut "Situação Geral": pendentes (âmbar) × concluídos (verde), total absoluto no centro.
- Top 10 — Valor Pendente: ranking de técnicos, barras proporcionais, posições 1–3 destacadas. **Clicável e multiselect** — clicar filtra a tabela por aquele técnico e acumula.

**Filtros** (todos combinam; qualquer mudança recarrega tabela + métricas):

| Filtro | Tipo |
|---|---|
| Colaborador | multiselect com busca por nome **ou** matrícula |
| Supervisor / GC / GO | multiselect (GC e GO resolvem para matrículas antes de consultar) |
| Serial | texto, busca parcial, múltiplos separados por vírgula |
| Serviço GDIS | texto, busca parcial |
| Status | `PENDENTE` / `CONCLUIDO` |
| Material | categoria do equipamento |
| Data Atribuição / Data Conclusão | intervalos |

**Tabela:** Data Atrib. · Serial · Colaborador · Supervisor · Serviço GDIS · Status · Dias · Conclusão · Ações. Paginação de 50, ordenação multi-coluna configurável, exportação CSV que respeita todos os filtros (UTF-8 com BOM).

**Ações por linha:** ver/editar (modal completo com log de atividades), vincular serviço (só em `PENDENTE` — já marca `CONCLUIDO`), excluir (confirmação + exclusão otimista). Somem inteiras para quem não tem `canWrite`.

**Modal de edição:** campos editáveis (serial, material SAP, serviço GDIS, data de atribuição, status, data de conclusão, colaborador) + painel read-only que reage às mudanças (supervisor, equipamento, dias, valor) + linha do tempo de `medidor_logs`.

| Evento no log | Quando |
|---|---|
| Cadastrado | INSERT |
| Concluído | `PENDENTE → CONCLUIDO` |
| Serviço vinculado | `servico_gdis` preenchido sem mudar status |
| Serviço removido | `servico_gdis` → NULL |
| Reaberto | `CONCLUIDO → PENDENTE` |
| Reatribuído | mudança de `matricula` |
| Editado | mudança de `material_sap` |

### 9.2 Lançamento (`/dashboard/lancamento`)

Registra a entrega física. Formulário: colaborador (autocomplete nome/matrícula, seleção com Enter) · data (default hoje) · material SAP (busca por código ou descrição) · seriais (vários, separados por Enter ou vírgula).

Validação em tempo real por serial via `verificar_medidor_atribuido`: **disponível** ou **conflito**. No conflito, modal mostra técnico atual, data original e supervisor; confirmando, `reatribuir_medidor` fecha a linha anterior como `REATRIBUIDO` e cria a nova.

Após o INSERT, o trigger tenta vincular automaticamente qualquer serviço que já estivesse esperando por aquele serial.

### 9.3 Importação (`/dashboard/importacao`)

Lê `.xlsx` e `.csv` no browser. Abas:

- **Relatório GDIS** — upsert em `servicos_report` por número de serviço. Colunas lidas por aliases PT/EN **e por índice posicional** (resiste a encoding windows-1252). Matrícula iniciada em `C` é de terceiro: não bloqueia e não é gravada. Se sobrar matrícula desconhecida, a importação **não roda** e a tela lista quem falta; supervisor+ pode "forçar" via `importar_servicos_forcado`.
- **Planilha de Atribuições (Juliana)** — colunas por índice: 1 = Material SAP, 2 = Serial, 10 = Recebedor (matrícula), 11 = Data. Antes de executar, mostra 3 listas: **Devolvidos** (existe no banco, sumiu da planilha → deletar), **Reatribuições** (matrícula diferente → atualizar), **Divergências** (material/data diferentes → atualizar).
- **Planilha PC** — vinculação em lote via `importar_planilha_pc`, em lotes de 500 com progresso.

Supervisor e Almoxarifado veem só a aba **Atribuições**: GDIS, PC, TC e Lucas gravam serviço.

### 9.4 Conferência (`/dashboard/conferencia`) — só quem vincula serviço

- **Pendentes de conferência** (`status_conferencia = 'PENDENTE'`): botão Copiar (copia o nº do serviço e foca o campo) + campo de serial + Vincular (ou Enter) → `vincular_servico_medidor`.
- **Aguardando vinculação**: ✏️ Corrigir (input inline, tenta vincular de novo) e ↩️ Reverter (volta para `PENDENTE`, limpa `serial_buscado`). Exportação em Excel disponível.
- Botão **Verificar vinculações** no cabeçalho roda o lote.

### 9.5 Conferência +45 dias (`/dashboard/conferencia-45dias`)

Lista paginada (`get_conferencia_45dias`) dos medidores `PENDENTE` com mais de N dias (default 45), ordenável por dias e com busca por serial. Cada linha permite digitar o serviço GDIS e vincular direto (`vincularServicoGdisMedidor` → marca `CONCLUIDO` com `data_conclusao` = hoje) ou **ocultar** o item (persistente e compartilhado, reversível na seção de ocultados). Supervisor e Almoxarifado só ocultam: o campo de serviço aparece só para leitura.

### 9.6 Duplicidade (`/dashboard/duplicidade`)

Dois critérios, cada grupo etiquetado:
- **SERVICO** — um serviço GDIS puxou mais de um serial (âmbar).
- **SERIAL** — o mesmo serial em mais de uma linha, duplicata literal ou vinculado a dois serviços (violeta).

Ações por linha:
- **Nº medidor** — substitui o serial da linha (`substituir_serial_medidor`). Todos que escrevem.
- **Nº serviço** — substitui ou grava o serviço GDIS da linha (`substituir_servico_medidor`). Só quem vincula serviço.
- **Desvincular** — limpa `servico_gdis` e volta para `PENDENTE`; resolve vínculo errado, não linha sobrando. Desabilitado quando outra linha do mesmo serial já está `PENDENTE` (o índice `idx_medidor_serial_pendente_unico` recusaria).
- **Excluir linha** (grupos SERIAL) — `excluir_medidor_duplicado`, destrutivo.

No grupo: **Marcar revisado** / **Reverter revisão**.

### 9.7 Gestão de Colaboradores e de Usuários

- **Colaboradores** (supervisor+): CRUD com busca, filtros por supervisor/GC/GO, paginação de 25. Exclusão bloqueada quando há medidores vinculados — a tela mostra a contagem e orienta a inativar.
- **Usuários** (supervisor+): cria com senha padrão, edita nome/e-mail/papel/status, dispara link de redefinição de senha, exclui. Passa pelas rotas `/api/users`.

### 9.8 Log de auditoria (`/dashboard/auditoria`, ADMIN e GESTOR)

Fora do menu lateral: abre clicando no nome do usuário, no rodapé da barra lateral. Lista `auditoria_log` do mais recente para o mais antigo, 50 por página, com filtros por busca (serial, serviço, matrícula ou usuário), área, evento e período. Cada linha mostra quando, quem (nome, papel e origem automático/sistema), o evento e o antes → depois de cada campo alterado. Tentativas recusadas aparecem como **Acesso negado**.

A antiga aba **Recuperação de Dados** foi removida (2026-10-20): não era mais usada. A tabela `medidor_recuperacao_pendente` continua e a Automação GDIS ainda trata a fila de Recuperação.

### 9.9 Automação GDIS (ADMIN e GESTOR, **desktop-only**)

Robô que descobre o serial instalado consultando o GDIS. Não funciona em celular — depende de um **conector local**:

- `conector/conector.js`: Node + Express + Playwright (msedge), escuta em `http://localhost:3334`, acessa o GDIS em `http://192.168.122.110/contratadaweb/` (rede interna), com pausa de 1,2 s entre consultas.
- Endpoints: `GET /ping`, `GET /status-stream` (SSE), `POST /iniciar-sessao` (`{cnpj, inscEstadual}`), `POST /continuar-apos-captcha`, `POST /buscar-seriais`, `POST /cancelar`.
- Fluxo: abre o navegador → usuário resolve o captcha → o robô percorre as duas filas (**Recuperação** e **Conferência**), lê o serial de cada serviço e, no modo automático, grava.
- Cada rodada tem um `execucao_id` e persiste linha a linha em `automacao_gdis_log` (um lote de 3 mil leva ~2 h e a aba pode morrer no meio). Relatório CSV por rodada.

---

## 10. Regras de negócio

- **Um serial só pode ter uma linha `PENDENTE`** (índice único parcial). Segundo lançamento do mesmo serial = conflito → reatribuição.
- Medidor `CONCLUIDO` pode ter o mesmo serial lançado de novo (novo ciclo).
- `REATRIBUIDO` é linha histórica: fica no banco com `reatribuido_de_id`/`data_reatribuicao`, mas **não aparece na view** nem nas métricas nem na duplicidade.
- **Vincular um serviço GDIS sempre marca `CONCLUIDO`** — por conferência, por modal de edição, por botão inline na lista ou pela conferência +45 dias. `data_conclusao` recebe hoje se estiver vazia.
- `servico_gdis` vazio ao salvar precisa ir como `null` explícito (não `undefined`), senão o campo não é limpo.
- Vincular um serviço que ainda não foi importado é permitido: `garantir_servico_report` cria a linha como `CONFERIDO` antes do UPDATE, satisfazendo a FK.
- Valores em R$ **nunca são digitados** — vêm sempre de `tipos_de_medidores.valor`.
- `DIAS DE ATRIBUIÇÃO` = `COALESCE(data_conclusao, CURRENT_DATE) - data`.
- "+45 dias" = `PENDENTE` com mais de 45 dias sem conclusão. É a métrica crítica do negócio.
- Matrícula é sempre minúscula no banco; matrícula iniciada em `C` é terceiro e nunca é cadastrada.
- Duplicidade ignora TC e chave de aferição (`tipos_de_medidores.tipo NOT ILIKE 'MEDID%'`).
- Colaborador com medidores/serviços vinculados não pode ser excluído — inativar.

---

## 11. Armadilhas conhecidas

| Armadilha | O que acontece / como evitar |
|---|---|
| **Limite de 1.000 linhas do PostgREST** | Qualquer `select` sem paginação corta em 1.000. Todo carregamento completo no código pagina em blocos de 1.000 até esgotar (`getAllMedidoresCompleto`, `getMedidoresParaSync`, etc.). |
| **Paginação sem `ORDER BY`** | Já causou bug real: métricas contavam linhas repetidas e omitia outras (2832 buscadas → 2479 únicas). Sempre ordenar ao paginar; melhor ainda, agregar no banco. |
| **`PGRST103` (range não satisfatório)** | Quando a lista encolhe entre o carregamento e a troca de página, o PostgREST devolve erro em vez de página vazia. O código detecta e refaz na página 1. |
| **FK `medidores_list.servico_gdis`** | Vincular serviço inexistente estoura `23503`. Usar `garantir_servico_report` antes. Excluir serviço já vinculado também estoura — checar antes. |
| **Colunas com acento/espaço na view** | No PostgREST precisam de aspas: `"SERVIÇO GDIS"`, `"Concluído/Pendente"`, `"DIAS DE ATRIBUIÇÃO"`. |
| **`SECURITY DEFINER` sem `search_path`** | Herda o `search_path` do chamador. Quebrou a criação de **todo** usuário novo (GoTrue chama como `supabase_auth_admin`, `search_path = auth`). Sempre `SET search_path = public`. |
| **Datas DD/MM lidas como MM/DD** | Bug já corrigido na importação; qualquer novo parser de planilha precisa tratar isso. |
| **Usuários órfãos em `auth.users`** | `admin@traceone.com`, `almox@traceone.com`, `gestor@traceone.com` (criados em 2026-07-28) não têm linha em `profiles`. Se forem usados, criar o profile à mão. |
| **Migrations fora do git** | `.gitignore` tem `/supabase/migrations/` — novas migrations **não entram no repositório**. As já commitadas continuam versionadas. Os arquivos existem só localmente em `supabase/migrations/`. |
| **Numeração das migrations** | O nome do arquivo e o cabeçalho interno divergem em um dígito a partir da 004 (ex.: `005_reatribuicao.sql` tem cabeçalho "004"). Confiar no nome do arquivo. |

---

## 12. Identidade visual

Arquivos-fonte em **`docs/marca/`** (com `LEIA-ME.md`). Tokens em `frontend/app/traceone-tema.css`, importado logo após `@import "tailwindcss"` no `globals.css`.

**Símbolo:** um "1" traçado como trilha de circuito — sai do anel vazio (medidor pendente) e termina no ponto azul cheio (medidor concluído). É a jornada do medidor em uma forma só.

### Paleta (hex prontos para `Color(0xFF…)` no Compose)

| Token | Hex | Uso |
|---|---|---|
| `tinta` | `#0F172A` | texto principal, logotipo, traço do símbolo |
| `sinal` | `#2563EB` | ação principal, links, foco, ponto da marca |
| `sinal-forte` | `#1D4ED8` | hover/pressed do botão principal |
| `sinal-fundo` | `#EFF6FF` | item ativo de menu, linha selecionada |
| `sinal-claro` | `#60A5FA` | ponto da marca sobre fundo escuro |
| `noite` | `#070C1F` | login e sidebar |
| `noite-alto` | `#0D1640` | topo do degradê |
| `noite-baixo` | `#040810` | base do degradê |
| `nevoa` | `#F8F9FA` | fundo das páginas |
| `linha` | `#E2E8F0` | bordas e divisórias |
| `aco` | `#64748B` | texto secundário |
| `aco-claro` | `#94A3B8` | ícones inativos, placeholders (não usar em texto) |

**Status (texto / fundo / marcador):**

| Status | Texto | Fundo | Marcador | Forma do marcador |
|---|---|---|---|---|
| Pendente | `#B45309` | `#FFFBEB` | `#F59E0B` | anel vazio |
| Revisão | `#6D28D9` | `#F5F3FF` | `#8B5CF6` | dois anéis lado a lado |
| Concluído | `#047857` | `#ECFDF5` | `#10B981` | ponto cheio |
| Erro | `#B91C1C` | `#FEF2F2` | `#EF4444` | anel com barra |

> O status persistido é **binário** (`PENDENTE | CONCLUIDO`). `revisao` hoje só é usado no caso `AMBIGUO` da Recuperação de Dados; `erro` não tem call site.

**Fontes:** Archivo (marca, títulos e interface, com eixo `wdth`) e Atkinson Hyperlegible Mono (`font-codigo`) para **serial, matrícula, serviço GDIS e código SAP** — números que precisam ser lidos sem ambiguidade. Ambas disponíveis no Google Fonts.

**Cores ainda fora dos tokens:** navy de ação secundária `#1E3A5F`/`#2D5282`, borda da sidebar `#1E2942`, gradientes decorativos da tela de registro e as variáveis `--chart-1..5` do donut.

---

## 13. Guia para o app Android

### Premissa

O Android fala **direto com o Supabase**, com a mesma anon key e a mesma RLS. Não é preciso replicar regra de negócio: ela está nas RPCs. Regra prática — **se existe RPC, usar a RPC**; tabela direta só para leitura simples e para os UPDATEs que o web também faz direto.

### O que muda no celular

O TraceOne web é uma ferramenta de escritório. No celular, o valor está em **estar junto do medidor físico**:

| Tela do web | No Android |
|---|---|
| Lista de Medidores | ✅ essencial — com filtros reduzidos e busca por serial em destaque |
| Lançamento | ✅ **o maior ganho**: leitura do serial por câmera (código de barras / OCR) em vez de digitar |
| Conferência | ✅ faz sentido (vincular serviço ao serial no campo) |
| Conferência +45 dias | ✅ lista de cobrança, boa para o supervisor em campo |
| Duplicidade | ⚠️ opcional, tela densa |
| Colaboradores / Usuários | ⚠️ opcional, baixo uso móvel |
| Importação de planilhas | ❌ não faz sentido no celular |
| Automação GDIS | ❌ impossível: depende do conector local na rede interna |
| Log de auditoria | ⚠️ opcional, consulta de gestor |

### Escopo sugerido para a v1

1. **Login** (e-mail/senha) + primeiro acesso + esqueci minha senha.
2. **Meus medidores / Lista** com busca por serial e filtro por colaborador e status; KPIs resumidos via `get_medidores_metrics`.
3. **Lançamento com scanner** de serial, validação de conflito via `verificar_medidor_atribuido` e reatribuição via `reatribuir_medidor`.
4. **Vincular serviço**: scanner/digitação do serial + número GDIS → `vincular_servico_medidor`.
5. **Detalhe do medidor** com a linha do tempo de `medidor_logs`.

### Detalhes técnicos que o app precisa respeitar

- **Paginar em blocos de até 1.000** e sempre com ordenação estável.
- **Usar as RPCs de agregação** (`get_medidores_metrics`, `get_conferencia_45dias`) em vez de baixar a tabela — são uma linha de resposta contra 16 mil.
- **Normalizar a matrícula para minúsculo** antes de enviar (o trigger faz, mas comparações locais quebram sem isso).
- **Datas**: `data` e `data_conclusao` são `DATE` (`YYYY-MM-DD`, sem fuso). Não converter para instante — `LocalDate`, não `Instant`.
- **Valores**: `NUMERIC(10,2)` → usar `BigDecimal`, nunca `Double`, e formatar em `pt-BR`.
- **Esconder ações de escrita** para quem não tem `canWrite` (`DESPACHANTE`), mas lembrar que a proteção real é a RLS — a UI só evita o erro.
- **Tratar `23503`** (FK) e **`PGRST103`** (range) com mensagens próprias, como o web faz.
- **Offline**: o app pode cachear `colaboradores` e `tipos_de_medidores` (mudam pouco). Fila de lançamentos offline é possível, mas atenção — a checagem de serial duplicado só é confiável online, e o índice único parcial vai rejeitar no sync.
- **Realtime** (opcional): `medidores_list` e `servicos_report` podem ser assinadas via Realtime para a lista se atualizar sozinha.

### Modelos Kotlin de partida

```kotlin
@Serializable
data class Medidor(
    val id: String,
    val data: String,                 // DATE YYYY-MM-DD
    @SerialName("material_sap") val materialSap: String,
    val serial: String,
    val matricula: String,
    @SerialName("servico_gdis") val servicoGdis: String? = null,
    val status: String,               // PENDENTE | CONCLUIDO | REATRIBUIDO
    @SerialName("data_conclusao") val dataConclusao: String? = null,
)
```

Para a view, atenção aos nomes com acento e espaço:

```kotlin
@Serializable
data class MedidorCompleto(
    val id: String,
    @SerialName("Data") val data: String,
    @SerialName("Serial") val serial: String,
    @SerialName("COLABORADOR") val colaborador: String,
    @SerialName("SUPERVISOR") val supervisor: String? = null,
    @SerialName("SERVIÇO GDIS") val servicoGdis: String? = null,
    @SerialName("Concluído/Pendente") val status: String,
    @SerialName("VALOR") val valor: Double,
    @SerialName("DIAS DE ATRIBUIÇÃO") val dias: Int,
)
```

### Referência da camada de dados do web

`frontend/lib/api.ts` é o catálogo completo de operações já implementadas — vale ler como especificação antes de escrever o repositório Kotlin. Funções principais: `login`, `getProfile`, `getTiposMedidores`, `getColaboradores`, `getSupervisores`, `getMedidoresCompleto`, `getAllMedidoresCompleto`, `getMedidoresMetrics`, `createMedidor(es)`, `updateMedidor`, `deleteMedidor`, `getMedidorLogs`, `verificarMedidorAtribuido`, `reatribuirMedidor`, `getMedidorReatribuicaoInfo`, `importServicos`, `importServicosForcado`, `getServicosConferencia`, `getServicosAguardandoVinculacao`, `vincularServicoMedidor`, `vincularServicoGdisMedidor`, `verificarVinculacoesPendentes`, `reverterServicoPendente`, `deleteServicoReport`, `getMedidoresConferencia45Dias`, `getConferencia45DiasOcultos`, `ocultarMedidor45Dias`, `reverterOcultarMedidor45Dias`, `getDuplicidadeMedidores`, `marcarDuplicidadeRevisado`, `excluirMedidorDuplicado`, `desvincularDuplicidadeMedidor`, `getMedidoresParaSync`, `syncAtribuicoes`, `getMedidoresParaPC`, `importarPlanilhaPC`, `getRecuperacaoPendente`, `resolverRecuperacaoPendente`, `substituirSerialMedidor`, `substituirServicoMedidor`, `getAuditoria`, `registrarAutomacaoLog`, `getAutomacaoExecucoes`, `getMedidoresAcima45Dias`, `changeOwnPassword`, `requestPasswordReset`, CRUD de usuários e colaboradores.

---

## 14. Ambiente, deploy e scripts

### Estrutura do repositório

```
CONTEXTO_GERAL.md      este arquivo
frontend/              app Next.js (Dockerfile aqui) + scripts .ts de manutenção
supabase/migrations/   SQL (fora do git a partir da 021 — ver armadilhas)
conector/              conector local Node+Playwright do GDIS
docs/marca/            arquivos-fonte da identidade visual
backend/               resíduo (src/users) — não é o backend ativo
Importação/            planilhas de trabalho (não versionadas)
backup/                dumps locais
docker-compose.yml     serviço único na porta 3000
```

### Deploy

```bash
cd /c/APPWEB/traceone
docker compose build --no-cache
docker compose up -d
```

O build recebe `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` como build args (precisam existir em tempo de build para o Next.js embutir). `SUPABASE_SERVICE_ROLE_KEY` entra só como variável de ambiente em runtime.

### Migrations

Rodadas **à mão** pelo dono do projeto, a partir de `frontend/`:

```bash
npx tsx run_migration.ts <arquivo.sql>
```

> Toda operação de `DELETE` em produção exige backup prévio e escopo travado.

### Scripts descartáveis

Scripts de diagnóstico criados em `frontend/*.ts` para investigar o banco devem ser **apagados assim que o teste terminar**. Os permanentes são `run_migration.ts`, `import_colab.ts`, `verify_db.ts`.

---

## 15. Histórico de decisões relevantes

### 15.1 Hierarquia de permissões (2026-08-06)

`role_type` passou de 3 para 5 valores (`016`–`017`); `ALMOXARIFE` virou `ALMOXARIFADO` via `ALTER TYPE ... RENAME VALUE`. Foram removidas as policies `allow_all_*` que liberavam acesso total a `public` (`018`). Criados `frontend/lib/permissions.ts`, a tela `/dashboard/usuarios` e as rotas `/api/users` (únicos pontos que tocam a `service_role`).

**Dois bugs encontrados no caminho:**
1. `handle_new_user()` tinha `'ALMOXARIFE'` hardcoded como fallback — o literal é resolvido em tempo de parse, então quebrava a criação de **qualquer** usuário mesmo sem cair naquele branch. Corrigido na `020`.
2. A mesma função era `SECURITY DEFINER` **sem** `SET search_path`. O GoTrue chama como `supabase_auth_admin` (`search_path = 'auth'`), então o `INSERT INTO profiles` não resolvia. Testes conectando como `postgres` sempre funcionavam — por isso demorou a aparecer. Corrigido na `021`. Provavelmente esse bug é anterior a todas as migrations do projeto.

### 15.2 Gestão de senha (2026-08-06)

Modelo de senha temporária padrão substituiu o convite por e-mail, a pedido explícito do dono do projeto. Detalhes no item [4](#4-autenticação-e-sessão).

Nota técnica do web: `useSearchParams()` na página de login (banner `?resetok=1`) exige `<Suspense>` — daí o par `LoginPage` (wrapper) + `LoginPageInner`. Sem isso o `next build` falha.

### 15.3 Donut "Situação Geral" — componente vendorizado do Bklit UI (2026-08-06)

O projeto **não tem shadcn/ui configurado**. Em vez de inicializar todo esse tooling por um gráfico, os arquivos do componente de `https://bklit.com` foram vendorizados à mão: baixar `https://bklit.com/r/<nome>.json`, resolver `registryDependencies` recursivamente, extrair `files[].content` para os `target` paths, instalar as dependências npm listadas e conferir se faltam CSS vars/utilities em `globals.css`. Resultado em `frontend/components/charts/` + `frontend/lib/utils.ts`. `recharts` foi removido do projeto.

> **Não confundir com bug:** testado por Playwright headless, o donut aparece "quebrado" em capturas feitas ~2,5 s após o load — é só a animação de entrada (`useMountProgress`, ~1,1 s + stagger), que roda bem mais devagar em Chromium headless. Esperando mais alguns segundos, renderiza perfeito.

### 15.4 Qualidade de dados — problemas já corrigidos

- Matrículas com espaço/`\xa0` no final (`e253433 `): 6 colaboradores duplicados; medidores migrados e duplicatas excluídas.
- Case inconsistente em `go`/`gc`/`supervisor` normalizado para Title Case.
- Supervisor "Aecio" removido dos vínculos (`supervisor = NULL`).
- `'Clerio Goncalves dos Santos'` → `'Clerio Goncalves Dos Santos'`.

### 15.5 Incidente de perda de dados (2026-09-16)

Medidores foram reconstruídos cruzando fontes. Os que ficaram sem serial confiável ou com mais de um candidato estão em `medidor_recuperacao_pendente` e eram tratados na tela de Recuperação de Dados — parte manualmente, parte pela Automação GDIS. A tela foi removida em 2026-10-20; o que sobrou é tratado só pela Automação GDIS.

### 15.6 Vínculo de serviço por papel e log de auditoria (2026-10-20)

Migrations `044` (enum, rodar sozinha) e `045`. Criado o papel `ALMOXARIFADO_211`; Supervisor e Almoxarifado deixaram de vincular serviço (trava no banco por trigger, não só na tela); Gestor ganhou Backup, Automação GDIS e Log de auditoria. Criada `auditoria_log` com trigger genérico nas tabelas operacionais. Erros do banco passaram a ter título e explicação (`frontend/lib/erros.ts`, códigos `TOxxx`).

---

## 16. Próximos passos

1. **App Android** — escopo da v1 no item [13](#13-guia-para-o-app-android); o maior ganho é a leitura do serial por câmera no lançamento.
2. **Resolução de conflitos de match** — tela para as ambiguidades do `match_medidores`.
3. **Histórico completo de reatribuições** — hoje o modal mostra só a última.
4. **Cron/job de limpeza** — `servicos_report` antigos, para manter performance.
5. **Notificações** — alertar gestores quando medidores ultrapassam 45 dias.
6. **Voltar as migrations para o git** — hoje só existem na máquina local.
