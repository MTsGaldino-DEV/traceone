# Contexto Geral: Projeto TraceOne — Controle de Medidores

> **Atualizado em:** 2026-08-06
> **Ponto de entrada** para qualquer novo desenvolvedor ou IA no projeto.

---

## 1. O Que É o TraceOne

Sistema web de rastreamento de medidores de energia elétrica para uso interno de uma concessionária de energia (utilities). O fluxo central é:

1. Medidores são **entregues fisicamente** a técnicos de campo (colaboradores)
2. Os técnicos instalam os medidores e executam serviços registrados no GDIS (sistema SAP interno)
3. O TraceOne **cruza** os medidores entregues com os serviços executados e garante que nenhum medidor fique sem baixa

**Público-alvo:** gestores operacionais que acompanham status de instalação em tempo real.  
**Uso:** diário, decisões rápidas sobre reatribuições e pendências financeiras.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router), React, Tailwind CSS |
| Gráficos | Recharts (PieChart/donut) |
| Ícones | Lucide React |
| Parser de planilhas | `xlsx` (lê `.xlsx` e `.csv` no browser) |
| Backend / DB | Supabase (PostgreSQL) — Triggers, Views, RPCs, RLS |
| Deploy | Docker (`docker compose build && up -d`) |

---

## 3. Estrutura de Rotas

```
/login                                   — Autenticação
/register                                — Cadastro

/(dashboard)/layout.tsx                  — Shell: sidebar + proteção de rota

/(dashboard)/dashboard/page.tsx          — ★ Lista de Medidores (principal)
/(dashboard)/dashboard/importacao/       — Importação de planilhas (2 abas)
/(dashboard)/dashboard/lancamento/       — Lançamento manual de medidores
/(dashboard)/dashboard/conferencia/      — Conferência de serviços GDIS
```

---

## 4. Banco de Dados

### 4.1 Tabelas Principais

| Tabela | Descrição |
|---|---|
| `tipos_de_medidores` | Catálogo de equipamentos: código SAP, tipo, ligação (direto/indireto), valor unitário (R$) |
| `colaboradores` | Técnicos: matrícula (PK), nome, supervisor, gc, go, ativo |
| `medidores_list` | Registro de entrega: serial, material_sap, matricula (FK), data, status, servico_gdis, data_conclusao |
| `servicos_report` | Importações do GDIS: numero de serviço, matricula, termino, status_conferencia, serial_buscado |
| `medidor_logs` | Log de eventos por medidor: cadastro, conclusão, vinculação, reatribuição, reabertura |
| `profiles` | Usuários do sistema (Supabase Auth) |

### 4.2 View

- **`vw_medidores_completo`** — une `medidores_list` + `colaboradores` + `tipos_de_medidores`. Expõe colunas formatadas em PT: `"Serial"`, `"COLABORADOR"`, `"SUPERVISOR"`, `"SERVIÇO GDIS"`, `"Concluído/Pendente"`, `"VALOR"`, `"DIAS DE ATRIBUIÇÃO"`, `"Data da conclusão"`, `"EQUIPAMENTO"` etc.

### 4.3 Enums

- **`status_medidor`**: `PENDENTE` | `CONCLUIDO` | `REATRIBUIDO`
- **`status_conferencia`**: `PENDENTE` | `AGUARDANDO_VINCULACAO` | `CONFERIDO`

### 4.4 Migrations (ordem de aplicação)

| # | Arquivo | O que faz |
|---|---|---|
| 000 | `drop_all.sql` | Reset total do schema |
| 001 | `initial_schema.sql` | Tabelas base, enums, indexes |
| 002 | `rls_policies.sql` | Políticas Row Level Security |
| 003 | `rpc_functions.sql` | RPC `match_medidores` (conciliação automática) |
| 004 | `reatribuicao.sql` | Status `REATRIBUIDO`, colunas de auditoria, índice único parcial |
| 005 | `rpc_verificar.sql` | RPC `verificar_medidor_atribuido` |
| 006 | `rpc_reatribuir.sql` | RPC `reatribuir_medidor` |
| 007 | `conferencia_servicos.sql` | Coluna `status_conferencia` + `serial_buscado` em `servicos_report` |
| 008 | `rpc_vincular_servico.sql` | RPC `vincular_servico_medidor` |
| 009 | `aguardando_vinculacao.sql` | Status `AGUARDANDO_VINCULACAO` no enum |
| 010 | `fn_tentar_vincular_serial.sql` | Função interna `_tentar_vincular_serial` — seta `status=CONCLUIDO` no medidor ao vincular |
| 011 | `update_vincular_servico.sql` | Atualização da RPC de vinculação |
| 012 | `trigger_vinculacao_automatica.sql` | Trigger: ao inserir medidor `PENDENTE`, tenta vincular serviços em `AGUARDANDO_VINCULACAO` automaticamente |
| 013 | `rpc_verificar_pendentes.sql` | RPC `verificar_vinculacoes_pendentes` (retorna contagem) |
| 014 | `rpc_get_metrics.sql` | Função `get_medidores_metrics` (escrita mas métricas resolvidas client-side) |
| 015 | `medidor_logs.sql` | Tabela `medidor_logs` + trigger `trg_log_medidor_evento` + backfill de histórico |
| 016 | `role_hierarchy_enum.sql` | Renomeia `ALMOXARIFE` → `ALMOXARIFADO` no enum `role_type`; adiciona `SUPERVISOR` e `DESPACHANTE` |
| 017 | `role_hierarchy_rls.sql` | Atualiza policies de escrita pros 5 roles (ver seção 11) |
| 018 | `remove_allow_all_policies.sql` | Remove policies `allow_all_*` não versionadas que liberavam acesso total a `public` |
| 019 | `fix_handle_new_user_default_role.sql` | Corrige literal `'ALMOXARIFE'` hardcoded (quebrado pela renomeação em 016) na trigger `handle_new_user` |
| 020 | `fix_handle_new_user_search_path.sql` | Fixa `search_path = public` na trigger `handle_new_user` (bug que impedia criação de QUALQUER usuário via Auth API/painel — ver seção 11.3) |

---

## 5. Funcionalidades em Detalhe

### 5.1 Lista de Medidores (`/dashboard`)

A tela principal do sistema. Dividida em 3 blocos:

#### Dashboard de Métricas

**KPI Cards (5 cards em grid `auto-fit minmax(180px, 1fr)`):**
- Valor Pendente (R$) — soma dos medidores com status `PENDENTE`
- Valor Concluído (R$) — soma dos medidores com status `CONCLUIDO`
- Valor Total (R$) — soma geral
- +45 Dias Pendente — medidores em campo há mais de 45 dias (alerta crítico, vermelho)
- Média de Dias — média de dias em campo dos pendentes

**Donut Chart (Recharts PieChart):**
- Anel com pendentes (âmbar) e concluídos (verde)
- Total absoluto no centro do anel
- Legenda lateral estruturada: nome + valor absoluto + % do total

**Top 10 — Valor Pendente:**
- Ranking dos 10 técnicos com maior valor de medidores pendentes em mãos
- Barra de progresso proporcional (barra #1 = 100%, demais escaladas)
- Posições 1–3 com badge âmbar destacado
- **Clicável e multiselect:** clicar em um técnico filtra a tabela pelos medidores dele; clicar em mais técnicos acumula o filtro; botão "Limpar seleção" no cabeçalho
- Redimensionável verticalmente via `resize: vertical` (drag no canto inferior direito)
- Scroll interno com header fixo quando a lista ultrapassa a altura disponível

> **Performance:** `getMedidoresMetrics` pagina em batches de 1.000 registros (limite Supabase) acumulando todos os dados localmente antes de calcular — garante que o total seja o real (16.137+) e não o limite da primeira página.

#### Painel de Filtros

Todos os filtros são aplicados simultaneamente. Trigger: qualquer mudança recarrega a tabela + recalcula as métricas.

| Filtro | Tipo | Descrição |
|---|---|---|
| Colaborador | `ColabMultiSelect` | Busca por **nome ou matrícula**; exibe nome + matrícula; multiselect |
| Supervisor | `MultiSelectSearch` | Lista de supervisores únicos; multiselect |
| GC | `MultiSelectSearch` | Gerência de Campo; multiselect |
| GO | `MultiSelectSearch` | Gerência Operacional; multiselect |
| Serial | Texto | Busca parcial; múltiplos separados por vírgula |
| Serviço GDIS | Texto | Busca parcial no número de serviço |
| Status | `MultiSelectSearch` | `PENDENTE` / `CONCLUIDO` |
| Material | `MultiSelectSearch` | Categoria: Medidores / TC / Chave De Aferição |
| Data Atrib. | Intervalo de datas | Início e fim da data de atribuição |
| Data Conclusão | Intervalo de datas | Início e fim da data de conclusão |

> Filtros GC e GO resolvem internamente para matrículas (`buildFinalMatriculas`) antes de consultar o banco.

#### Tabela de Medidores

- **Colunas:** Data Atrib. · Serial · Colaborador · Supervisor · Serviço GDIS · Status · Dias · Conclusão · Ações
- `table-layout: fixed` com `<colgroup>` — sem drift entre header e body
- `text-overflow: ellipsis` em colunas de texto variável
- Paginação de 50 registros por página com navegação (primeira/anterior/próxima/última)
- **Ordenação personalizada:** modal "Ordenar" com toggle por coluna (crescente → decrescente → sem ordenação)
- **Coluna Ações:**
  - 👁 **Ver / Editar** — abre modal de edição completa
  - 🔗 **Vincular Serviço** — botão verde visível apenas em linhas `PENDENTE`; abre mini-modal para digitar o nº GDIS e já marca como `CONCLUIDO` automaticamente
  - 🗑 **Excluir** — abre modal de confirmação com serial; exclusão otimista (linha some imediatamente, reverte com erro se falhar)

#### Modal de Edição / Detalhes

Exibe informações somente-leitura: Supervisor (atualiza dinamicamente ao trocar colaborador) · Equipamento · Dias Atribuído · Valor (atualiza ao trocar material).

Campos editáveis:
- **Serial** — texto livre
- **Material SAP** — `<select>` populado com `tipos_de_medidores` (todos, incluindo inativos); formato `cod_sap — tipo`; ao trocar, exibe a ligação (direto/indireto) abaixo e atualiza o Valor no painel read-only
- **Serviço GDIS** — texto livre; ao salvar com qualquer valor preenchido, força automaticamente `status = CONCLUIDO` e preenche `data_conclusao` com hoje (se vazia); ao salvar em branco, limpa o campo no banco (`null` explícito)
- **Data de Atribuição** · **Status** (select PENDENTE/CONCLUIDO) · **Data de Conclusão**
- **Colaborador** — autocomplete por nome ou matrícula; ao selecionar, preenche automaticamente o Supervisor no painel read-only

**Log de Atividades** — linha do tempo exibida no final do modal com todos os eventos do medidor:

| Evento | Cor | Quando é gerado |
|---|---|---|
| Cadastrado | Azul | INSERT em `medidores_list` |
| Concluído | Verde escuro | UPDATE status `PENDENTE → CONCLUIDO` |
| Serviço vinculado | Verde claro | UPDATE `servico_gdis` sem mudança de status |
| Serviço removido | Cinza | `servico_gdis` setado para NULL |
| Reaberto | Âmbar | UPDATE status `CONCLUIDO → PENDENTE` |
| Reatribuído | Roxo | UPDATE `matricula` |
| Editado | Cinza | UPDATE `material_sap` |

> O log é gerado pelo trigger `trg_log_medidor_evento` em `medidores_list`. Backfill aplicado para registros existentes na migration 015.

#### Exportar CSV

Botão "Exportar CSV" respeita **todos os filtros e ordenações** ativos — exporta exatamente o que está sendo visto, em todas as páginas (não só a página atual). UTF-8 com BOM para compatibilidade Excel.

---

### 5.2 Lançamento de Medidores (`/lancamento`)

Operador registra a **entrega física** de medidores a um técnico.

**Formulário:**
- **Colaborador** — autocomplete por nome ou matrícula
- **Data de Atribuição** — padrão: hoje
- **Material SAP** — busca por código ou descrição no catálogo `tipos_de_medidores`
- **Seriais** — campo de texto livre; múltiplos seriais separados por Enter ou vírgula

**Validação em tempo real de cada serial:**
- ✅ Disponível — nenhum registro ativo com aquele serial
- ⚠️ Conflito — já existe um medidor `PENDENTE` com esse serial

**Fluxo com conflito (Reatribuição):**
1. Serial já atribuído é detectado via RPC `verificar_medidor_atribuido`
2. Modal de conflito exibe: técnico atual, data de atribuição original, supervisor
3. Operador pode confirmar reatribuição → RPC `reatribuir_medidor` marca o registro anterior como `REATRIBUIDO` e cria novo registro, mantendo trilha de auditoria (`reatribuido_de_id`)

**Trigger automático pós-inserção:**
Ao inserir um medidor `PENDENTE`, o trigger `trg_auto_vincular_serial` verifica se já existe algum serviço `AGUARDANDO_VINCULACAO` com aquele serial e vincula automaticamente.

---

### 5.3 Importação de Planilhas (`/importacao`)

Duas abas independentes:

#### Aba 1 — Relatório GDIS

Importa os serviços executados pelo SAP/GDIS.

**Suporta:** `.xlsx` e `.csv` (colunas lidas por aliases PT/EN e por índice posicional para resistir a encoding windows-1252 em cabeçalhos).

**Campos mapeados:** número do serviço, matrícula do técnico, data de término, código do serviço, tipo.

**Execução:** `importServicos()` → upsert em `servicos_report` pelo número de serviço. Após importar, redireciona para a tela de conferência.

#### Aba 2 — Planilha de Atribuições (Juliana)

Exportação semanal do SAP com o estado atual de todos os medidores em campo. Usada para **sincronizar** o banco com a realidade.

**Colunas lidas por índice posicional** (evita problemas de encoding):
- Índice 1: Material SAP
- Índice 2: Serial
- Índice 10: Recebedor (matrícula do técnico)
- Índice 11: Data de Atribuição

**Análise antes de executar — 3 categorias:**

| Categoria | Condição | Ação |
|---|---|---|
| **Devolvidos** | Serial existe no banco mas não está na planilha (Recebedor vazio) | Deletar do `medidores_list` |
| **Reatribuições** | Serial existe mas com matrícula diferente | Atualizar matrícula/data/material |
| **Divergências** | Serial existe mas material ou data diferem | Atualizar campos divergentes |

O operador visualiza as 3 listas antes de executar e confirma com um clique.

---

### 5.4 Conferência de Serviços (`/conferencia`)

Tela onde o operador vincula cada serviço GDIS importado ao serial do medidor físico instalado.

#### Seção 1 — Pendentes de Conferência

Lista de serviços com `status_conferencia = 'PENDENTE'`. Para cada um:
- Botão **Copiar** — copia o número do serviço para a área de transferência e foca o campo de serial
- Campo de serial + botão **Vincular** (ou Enter) — chama `vincularServicoMedidor`:
  - Medidor encontrado (`PENDENTE` no banco) → vincula, seta `status = CONCLUIDO` e `data_conclusao` na migration 010
  - Medidor não encontrado → serviço vai para `AGUARDANDO_VINCULACAO` com o serial informado

#### Seção 2 — Aguardando Vinculação

Lista de serviços com `status_conferencia = 'AGUARDANDO_VINCULACAO'` (serial informado mas medidor ainda não cadastrado).

Cada linha tem dois botões de ação:

| Botão | Comportamento |
|---|---|
| **✏️ Corrigir** | Abre input inline pré-preenchido com o serial atual. Ao confirmar, tenta vincular novamente: se medidor existir vincula direto; se não, atualiza `serial_buscado` e permanece aguardando |
| **↩️ Reverter** | Volta o serviço para `status_conferencia = 'PENDENTE'` (limpa `serial_buscado`); o serviço retorna à fila de conferência para ser tratado do zero |

**Botão "Verificar vinculações"** (cabeçalho) — chama RPC `verificar_vinculacoes_pendentes` que tenta resolver todos os `AGUARDANDO_VINCULACAO` em lote contra os medidores `PENDENTE` cadastrados.

**Trigger automático:** ao lançar um novo medidor, o trigger `trg_auto_vincular_serial` verifica automaticamente se existe algum serviço `AGUARDANDO_VINCULACAO` com aquele serial e vincula sem precisar de ação manual.

---

### 5.5 Conciliação Automática

RPC `match_medidores()` cruza medidores `PENDENTE` com serviços `CONCLUIDO` por matrícula e intervalo de data:
- **Match exato** → atualiza `medidores_list` com o `servico_gdis` + `status = CONCLUIDO`
- **Ambiguidade** → sinaliza para resolução manual
- Pode ser disparada manualmente via `runMatchMedidores()` ou eventualmente por um job

---

## 6. lib/api.ts — Funções Públicas

| Função | Descrição |
|---|---|
| `login / logout / getSession / getProfile` | Auth Supabase |
| `getTiposMedidores(apenasAtivos?)` | Catálogo de equipamentos; `false` retorna todos incluindo inativos |
| `getColaboradores(search?)` | Lista colaboradores, com filtro opcional por nome/matrícula |
| `getSupervisores()` | Lista de supervisores únicos |
| `getMedidoresCompleto(filters)` | Dashboard: filtros + ordenação + paginação + count exato |
| `getMedidoresMetrics(filters?)` | Métricas agregadas + ranking top 10 (paginação completa client-side) |
| `createMedidor / createMedidores` | Lançamento simples e em lote |
| `updateMedidor(id, payload)` | Edição completa; aceita `servico_gdis: null` e `data_conclusao: null` para limpar os campos |
| `deleteMedidor(id)` | Exclusão |
| `getMedidorLogs(medidorId)` | Retorna log de atividades de um medidor ordenado cronologicamente |
| `importServicos(rows)` | Upsert em `servicos_report` |
| `getServicosConferencia(page)` | Lista serviços `PENDENTE` na conferência |
| `getServicosAguardandoVinculacao(page)` | Lista serviços `AGUARDANDO_VINCULACAO` |
| `verificarVinculacoesPendentes()` | Tenta resolver aguardando em lote; retorna contagem de vinculados |
| `reverterServicoPendente(servicoId)` | Reverte `status_conferencia` para `PENDENTE` e limpa `serial_buscado` |
| `vincularServicoMedidor(servicoId, serial)` | Vincula via RPC; retorna `{ ok, aguardando, serial, matricula, nome }` |
| `verificarMedidorAtribuido(serial)` | Checa conflito de serial antes de lançar |
| `reatribuirMedidor(params)` | Executa reatribuição transacional via RPC |
| `getMedidorReatribuicaoInfo(id)` | Histórico de reatribuição de um medidor |
| `runMatchMedidores()` | Dispara conciliação automática |
| `getMedidoresParaSync()` | Retorna medidores para comparação com planilha Juliana |
| `syncAtribuicoes(params)` | Executa devoluções + reatribuições + divergências da planilha Juliana |

---

## 7. Qualidade de Dados

### Problemas históricos já corrigidos

- **Matrículas com espaço/`\xa0` no final** (`e253433 `) — 6 colaboradores tinham duplicatas por espaço; medidores migrados para matrícula limpa, duplicatas excluídas
- **Case inconsistente** — `go = 'amarildo'` / `gc = 'breno'` / `supervisor = 'kesia'` normalizados para Title Case
- **Supervisor Aecio** — removido dos vínculos (`supervisor = NULL`) em todos os colaboradores
- **Nome com case inconsistente** — `'Clerio Goncalves dos Santos'` → `'Clerio Goncalves Dos Santos'`

---

## 8. Regras de Negócio Relevantes

- Só pode existir **um serial `PENDENTE`** por vez (índice único parcial)
- Medidor `CONCLUIDO` pode ter o mesmo serial lançado novamente (para novo ciclo)
- Um medidor `REATRIBUIDO` mantém trilha: `reatribuido_de_id` + `data_reatribuicao`
- Valores financeiros vêm de `tipos_de_medidores.valor` (não são digitados no lançamento)
- Coluna `DIAS DE ATRIBUIÇÃO` é calculada pela view: `COALESCE(data_conclusao, CURRENT_DATE) - data`
- Métrica "+45 dias" = medidores `PENDENTE` com mais de 45 dias sem conclusão
- **Vincular um serviço GDIS a um medidor sempre seta `status = CONCLUIDO`** — seja via conferência, via modal de edição, ou via botão inline na lista
- Campo `servico_gdis` vazio ao salvar envia `null` explícito ao banco (não `undefined`) para garantir que o campo seja limpo

---

## 9. Deploy

```bash
# Build e reinício do container
cd /c/APPWEB/traceone
docker compose build --no-cache
docker compose up -d
```

O `Dockerfile` está em `frontend/`. O `docker-compose.yml` está na raiz do repositório.

---

## 10. Próximos Passos

1. **Resolução de conflitos de match** — tela para ambiguidades do `match_medidores` (mais de 1 serviço por técnico no período)
2. **Histórico completo de reatribuições** — expandir modal com trilha completa (não só a última)
3. **Cron/job de limpeza** — limpar `servicos_report` antigos para manter performance
4. **Autenticação por perfil** — diferenciar permissões entre operador e gestor
5. **Notificações** — alertar gestores quando medidores ultrapassam 45 dias sem conclusão

---

## 11. Hierarquia de Permissões (2026-08-06)

### 11.1 O que foi implementado

- `role_type` agora tem 5 valores: `ADMIN`, `GESTOR`, `SUPERVISOR`, `ALMOXARIFADO`, `DESPACHANTE` (migrations `016`–`017`). `ALMOXARIFE` foi renomeado para `ALMOXARIFADO` via `ALTER TYPE ... RENAME VALUE`.
- RLS: escrita em `tipos_de_medidores`, `colaboradores`, `medidores_list`, `servicos_report` liberada para `ADMIN/GESTOR/SUPERVISOR/ALMOXARIFADO`; gestão de `profiles` (CRUD de usuários) liberada para `ADMIN/GESTOR/SUPERVISOR`. `DESPACHANTE` só lê.
- Achado e removido no caminho: existiam policies `allow_all_*` (não versionadas em nenhuma migration anterior) liberando leitura/escrita total a `public`, inclusive sem login, nas 4 tabelas operacionais — anulavam toda a hierarquia. Removidas na migration `018`.
- `frontend/lib/permissions.ts` (novo): `canWrite`, `canManageUsers`, `roleLabels`, `assignableRoles`.
- Sidebar (`layout.tsx`) filtra menu por role + redireciona se a rota atual não é permitida pro role do usuário.
- `dashboard/page.tsx`: ações de escrita (editar/excluir/vincular) somem para quem não tem `canWrite` (ex: Despachante).
- Nova tela `/dashboard/usuarios` — CRUD de usuários, só visível pra `ADMIN/GESTOR/SUPERVISOR`.
- `frontend/lib/supabase-admin.ts` + `app/api/users/route.ts` (POST) + `app/api/users/[id]/route.ts` (DELETE) — únicos pontos que tocam a `service_role` key, validando a sessão/role do chamador antes de qualquer operação admin. A chave nunca sai do servidor.
- Todas as migrations aplicadas em produção via `npx tsx run_migration.ts <arquivo>` (rodar da pasta `frontend/`).

### 11.2 Bug encontrado e corrigido: `handle_new_user()` quebrada

A migration `016` renomeou o enum `ALMOXARIFE` → `ALMOXARIFADO`, mas a função `handle_new_user()` (trigger `on_auth_user_created` em `auth.users`, que cria a linha em `profiles` automaticamente ao criar um usuário) tinha o valor antigo **hardcoded** como fallback:

```sql
COALESCE((NEW.raw_user_meta_data->>'role')::role_type, 'ALMOXARIFE')  -- 'ALMOXARIFE' não existe mais no enum
```

Isso quebrava a criação de **qualquer** usuário novo (Postgres tenta resolver o literal como `role_type` mesmo quando o `COALESCE` não cai nesse branch, porque é um cast de constante feito em tempo de parse). Corrigido na migration `019` trocando o literal para `'ALMOXARIFADO'`. **Já aplicada em produção.**

### 11.3 Segundo bug encontrado e corrigido: `search_path` da trigger — RESOLVIDO

Mesmo depois da correção 11.2, `supabase.auth.admin.createUser(...)` (SDK, API direta e o próprio painel do Supabase) continuava retornando:

```json
{"code":500,"error_code":"unexpected_failure","msg":"Database error creating new user"}
```

**Causa raiz:** `handle_new_user()` é `SECURITY DEFINER` mas não fixava `search_path`. O role `supabase_auth_admin` (quem o GoTrue usa de verdade pra criar usuários — confirmado com `SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'supabase_auth_admin'`) tem `search_path = 'auth'` **apenas**, sem `public`. Uma função `SECURITY DEFINER` sem `SET search_path` herda o `search_path` de quem a chama (não do dono) — então o `INSERT INTO profiles (...)` (sem schema qualificado) dentro da trigger tentava resolver `profiles`/`role_type` dentro do schema `auth`, onde não existem, e falhava.

Por isso os testes manuais conectando como `postgres` (cujo `search_path` inclui `public`) sempre funcionavam, mas a chamada real do GoTrue nunca funcionou — provavelmente **esse bug é anterior a qualquer migration deste projeto**, não uma regressão da hierarquia de permissões. Isso também explica os 3 usuários órfãos em `auth.users` sem linha em `profiles` (`admin@traceone.com`, `almox@traceone.com`, `gestor@traceone.com`, criados em 2026-07-28) — **provavelmente foram criados direto no painel/API do GoTrue antes da trigger existir**, então nunca tiveram profile gerado (não é sobre `000_drop_all.sql` como cheguei a suspeitar antes).

**Correção (migration `020`):**

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.role_type, 'ALMOXARIFADO')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Já aplicada em produção e confirmada funcionando** — usuário `matheus.galdino@engelmig.com.br` (ADMIN) criado com sucesso via `supabase.auth.admin.createUser()` depois dessa correção, com linha em `profiles` gerada corretamente pela trigger.

> **Lição pra qualquer função `SECURITY DEFINER` nova neste projeto:** sempre declarar `SET search_path = public` (ou schema explícito em cada referência) — nunca depender do `search_path` de quem chama.

Os 3 usuários órfãos (`admin@traceone.com`, `almox@traceone.com`, `gestor@traceone.com`) continuam sem `profiles` — se forem usados, alguém vai precisar inserir a linha manualmente em `profiles` ou recriá-los.

### 11.4 Gestão de senha — sem o admin nunca saber a senha definitiva de ninguém (2026-08-06)

Modelo adotado: **usuário novo nasce com senha temporária padrão `123456`** (constante `DEFAULT_PASSWORD` em `frontend/lib/permissions.ts`, compartilhada entre backend e frontend); o próprio usuário troca por uma senha só dele no primeiro acesso. O admin nunca define nem vê a senha definitiva de ninguém.

> Já existiu uma versão anterior desse fluxo baseada em convite por email (`inviteUserByEmail`) — foi substituída por essa abordagem de senha padrão a pedido explícito do usuário do projeto. Não reintroduzir o fluxo de convite sem confirmar antes.

- **Criar usuário** (`/dashboard/usuarios`) → admin informa só nome/email/papel → `POST /api/users` chama `supabase.auth.admin.createUser({ email, password: DEFAULT_PASSWORD, email_confirm: true, user_metadata: { name, role } })` (service role). Sem envio de email nessa etapa.
- **Primeiro acesso** (tela de login, link "É seu primeiro acesso?") → usuário informa email + a senha temporária (`123456` pré-preenchido) → `supabase.auth.signInWithPassword(...)` no client (sem passar pela nossa API) → se autenticar, `router.push("/reset-senha")` com a sessão real já estabelecida → lá ele define a senha definitiva (`updateUser({ password })`) → a página desloga (`signOut()`) e manda de volta pra `/login?resetok=1`, que mostra um banner de sucesso e pede pra entrar de novo já com a senha nova.
- **Editar usuário** → admin só edita nome/email/papel/status (`PATCH /api/users/[id]`). Pra resetar a senha de alguém que esqueceu a própria senha definitiva, o botão "Enviar link de redefinição de senha" dispara `supabase.auth.resetPasswordForEmail()` (API pública, não precisa de service role) — mesma função usada no "Esqueci minha senha" do login.
- **Usuário troca a própria senha já logado** (ícone de chave `KeyRound` no sidebar) → pede senha atual + nova; reautentica com `signInWithPassword` antes de aplicar `updateUser({ password })` — tudo client-side, sem service role (`changeOwnPassword` em `lib/api.ts`).
- **Esqueci minha senha** (tela de login, fluxo separado do "Primeiro acesso") → `resetPasswordForEmail(email, { redirectTo: origin + '/reset-senha' })`, pra quem já tinha senha própria e esqueceu.
- `/reset-senha` (`app/(auth)/reset-senha/page.tsx`) é a página pública compartilhada por **três fluxos**: primeiro acesso (sessão já ativa via `signInWithPassword` antes de chegar lá), link de recuperação de senha (sessão criada pelo Supabase a partir do hash da URL, `detectSessionInUrl`), e — se algum dia voltar — link de convite. Em qualquer caso, ela só chama `updateUser({ password })`, desloga e manda pro login.
- Rotas server-side compartilham o guard `requireManager()` em `frontend/lib/api-auth.ts` (extraído pra não duplicar entre as rotas).
- `useSearchParams()` na página de login (usado pro banner `?resetok=1`) exige um `<Suspense>` — o componente é dividido em `LoginPage` (wrapper com `Suspense`) + `LoginPageInner` (conteúdo real). Sem isso o `next build` falha com "useSearchParams() should be wrapped in a suspense boundary".

### 11.5 Convenção de scripts descartáveis

Scripts de diagnóstico criados em `frontend/*.ts` para investigar o banco direto (fora dos scripts permanentes do projeto como `run_migration.ts`, `import_colab.ts` etc.) devem ser **apagados assim que o teste for concluído** — não fazem parte do projeto, servem só pra uma pergunta pontual. Anotar aqui o que já foi testado evita recriar o mesmo script na próxima sessão.

---

## 12. Gráfico "Situação Geral" — componente vendorizado do Bklit UI (2026-08-06)

O donut do card "Situação Geral" (`/dashboard`) trocou de Recharts (`<PieChart><Pie><Cell>`) pra um componente composable (`<PieChart data={...}><PieSlice index={i} /><PieCenter defaultLabel="Total" /></PieChart>`) vindo de **https://bklit.com** (registry compatível com `shadcn` CLI, não é um pacote npm instalável direto).

### Como foi feito

O projeto **não tem shadcn/ui configurado** (sem `components.json`, sem `cn()`/tokens de tema) — rodar `npx shadcn@latest add @bklit/pie-chart` do zero exigiria inicializar todo esse tooling só por causa de um gráfico. Em vez disso, os arquivos-fonte foram **vendorizados manualmente**:

1. Baixado o JSON do registry direto (`curl https://bklit.com/r/pie-chart.json`, mais as `registryDependencies` `chart-animation` e `utils`, cada um com seu próprio JSON).
2. Extraído o campo `content` de cada `files[]` pro path indicado em `target`, resultando em:
   - `frontend/components/charts/` (11 arquivos: `pie-chart.tsx`, `pie-context.tsx`, `pie-slice.tsx`, `pie-center.tsx`, `pie-center-shell.tsx`, `chart-stat-flow.tsx`, `chart-center-typography.ts`, `animation.ts`, `motion-utils.ts`, `use-mount-progress.ts`, `use-enter-complete.ts`, `chart-reveal-clip.tsx`, `static-chart-preview-context.tsx`, `chart-defs.ts`)
   - `frontend/lib/utils.ts` (helper `cn()` clássico do shadcn, `clsx` + `tailwind-merge`)
3. Dependências runtime instaladas via npm: `@number-flow/react`, `@visx/group@4.0.1-alpha.0`, `@visx/responsive@4.0.1-alpha.0`, `@visx/shape@4.0.1-alpha.0`, `d3-shape` (+ `@types/d3-shape` como dev dep — some junto com o `recharts` removido, precisou ser readicionado manualmente), `motion`, `clsx`, `tailwind-merge`.
4. `recharts` foi **removido** do `package.json` (`npm uninstall recharts`) — era a única lib de gráfico no projeto e ficou 100% sem uso depois da troca.
5. Adicionadas variáveis CSS em `app/globals.css` (`:root`) que os componentes consomem via `var(--chart-1)`..`var(--chart-5)`, `--chart-background/foreground/foreground-muted/label`, mapeadas pra combinar com a paleta já usada no dashboard (âmbar `#f59e0b` = pendentes, esmeralda `#10b981` = concluídos). Também um bloco `@theme inline` mapeando `--color-foreground`, `--color-muted`, `--color-chart-label` pro Tailwind v4 gerar as utilities `text-foreground`, `bg-muted`, `text-chart-label` que o componente usa (o projeto não tinha esses tokens antes).

### Achado durante a verificação (não é bug — foi erro de metodologia de teste)

Ao testar via Playwright headless, o donut apareceu **quebrado** (fragmentos em vez de anel) em capturas de tela feitas ~2.5s depois do dashboard carregar. Investigação mostrou que a animação de entrada da lib (`useMountProgress`, tween de ~1.1s + stagger por fatia) simplesmente ainda não tinha terminado — em Chromium headless via Playwright ela roda visivelmente mais devagar que num browser normal em foreground. Esperando 10s a mais, o anel renderiza perfeitamente (âmbar/esmeralda, total no centro, sem erros de console). **Não mexer no código da lib achando que isso é bug** — é só a animação de entrada (visualmente correta pro usuário real).

### Se for vendorizar outro componente do Bklit no futuro

Repetir o mesmo processo: `curl https://bklit.com/r/<nome>.json`, resolver `registryDependencies` recursivamente, extrair `files[].content` pros `target` paths, instalar as `dependencies` npm listadas, e checar se o componente usa mais alguma CSS var/utility Tailwind que ainda não existe em `globals.css`.

---

## 13. Identidade visual (2026-09-23)

Os arquivos-fonte da marca (logotipos, ícones, tema CSS e componente `Logo`) ficam em **`docs/marca/`**, com um `LEIA-ME.md` descrevendo cada peça.

**Símbolo:** um "1" traçado como trilha de circuito — sai do anel vazio (medidor pendente) e termina no ponto azul cheio (medidor concluído). É a jornada do medidor em uma forma só.

**Cores principais:** Tinta `#0f172a` (texto e traço do símbolo), Sinal `#2563eb` (ação principal, links, foco, ponto da marca), Sinal claro `#60a5fa` (ponto da marca sobre fundo escuro), Noite `#070c1f` (login e sidebar). Os tokens vivem em `frontend/app/traceone-tema.css`, importado logo depois do `@import "tailwindcss"` no `globals.css`, e geram utilities do Tailwind v4 (`bg-tinta`, `text-sinal`, `border-linha`, `bg-pendente-fundo`, `font-codigo`…). Neutros: Névoa (fundo), Linha (bordas), Aço e Aço claro (texto secundário e ícones).

**Fontes:** Inter (`font-sans`, corpo de texto e interface), Space Grotesk (`font-titulo`, h1/h2/h3/.display) e IBM Plex Mono (`font-codigo`) para serial, matrícula, serviço GDIS e código SAP. As três via `next/font/google` no `app/layout.tsx`.

**Marcadores de status** (`frontend/components/StatusMedidor.tsx`): cada status tem um marcador SVG próprio, além da cor — anel vazio = pendente, dois anéis lado a lado = revisão (caso ambíguo), ponto cheio = concluído, anel com barra = erro. Cada um usa o token de texto, a versão `-fundo` e a versão `-marca`.

> Atenção ao ligar o componente em telas novas: o status persistido do medidor é **binário** (`StatusMedidor = 'PENDENTE' | 'CONCLUIDO'` em `lib/supabase.ts`). A variante `revisao` hoje é usada só no `tipo: "AMBIGUO"` da tela de Recuperação de Dados, e a variante `erro` não tem call site — a automação GDIS tem linguagem visual própria (ícones lucide) e não é status persistido.

Cores ainda fora dos tokens, por não terem equivalente na marca: o navy de ação secundária `#1e3a5f`/`#2d5282` (botões em várias telas), a borda `#1e2942` da sidebar, os gradientes decorativos da tela de registro e as cores do donut do Recharts (`--chart-1..5`, seção 12).
