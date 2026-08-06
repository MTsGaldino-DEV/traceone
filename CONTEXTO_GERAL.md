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
