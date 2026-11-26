# 01 — Descoberta do projeto: TraceOne (web)

Inventário do que foi encontrado no repositório em 19/11/2026. Leitura estática: o app, o conector e o banco não foram executados nem consultados. Legenda de confiabilidade: **CONFIRMADO** (visto no código, configuração ou documento consistente), **INFERIDO**, **NÃO VERIFICADO**, **PLANEJADO**.

## 1. O que é o produto

| # | Pergunta | Resposta | Status |
|---|---|---|---|
| 1 | O que é? | Sistema web interno de rastreamento de medidores de energia entregues a técnicos de campo, com cruzamento contra os serviços executados no GDIS (sistema do cliente). | CONFIRMADO (`CONTEXTO_GERAL.md` §1, rotas e RPCs em `frontend/lib/api.ts`) |
| 2 | Para quem? | Gestores operacionais, supervisores, almoxarifado e despachantes de uma empresa contratada de concessionária de energia. Seis papéis: `ADMIN`, `GESTOR`, `SUPERVISOR`, `ALMOXARIFADO`, `ALMOXARIFADO_211`, `DESPACHANTE`. | CONFIRMADO (`frontend/lib/permissions.ts`) |
| 3 | Objetivo principal | Garantir que nenhum medidor entregue fique sem baixa e mostrar quanto valor está parado em campo, com quem e há quantos dias. | CONFIRMADO (indicadores em `get_medidores_metrics`, tela principal) |
| 4 | Problema | Medidores têm valor financeiro; se o serviço que os instalou não é cruzado com a entrega, o item fica "pendente" e vira risco de cobrança. | CONFIRMADO no código (regra "+45 dias" é a métrica crítica); a consequência de negócio vem da documentação do projeto |
| 5 | Como afeta a operação | O processo anterior não está documentado no repositório; há indício de planilhas (importação de planilhas de atribuição, PC, TC e uma planilha histórica de recuperação). | INFERIDO |
| 6 | Solução | Cadastro de entregas (manual ou por planilha), importação de serviços do GDIS, vinculação serial-serviço (manual, em lote e automática por gatilho), painel com valores em R$ e conferências de pendências antigas. | CONFIRMADO |
| 7 | Funcionalidades reais | Ver seção 3. | CONFIRMADO |
| 8 | Fluxos principais | Lançar entrega → importar serviços → vincular → concluir; reatribuir; conferir +45 dias; resolver duplicidade. | CONFIRMADO |
| 9 | Tecnologias | Ver seção 4. | CONFIRMADO |
| 10 | Arquitetura | Front Next.js falando direto com Supabase; regras de negócio no banco (RPCs, gatilhos, RLS); duas rotas de servidor para gestão de usuários; conector local Node/Playwright para o GDIS. | CONFIRMADO |
| 11 | Integrações | GDIS (via conector local, rede interna); SAP (por código de material e planilhas); app Android irmão e telas portadas para a Central NEO. | CONFIRMADO (código/memória); Android e NEO são projetos separados |
| 12 | Automação / IA | Automação de consulta ao GDIS (robô Playwright). Não há IA. | CONFIRMADO / não há evidência de IA |
| 16 | Estado atual | Em produção na Vercel com dados reais (publicação registrada na memória em 06/11/2026). URL não registrada no código. | CONFIRMADO por memória; NÃO VERIFICADO em execução |
| 18 | Uso real | O banco contém dados reais, há backups, incidente de perda de dados em 16/09/2026 e rotinas de correção cadastral. Número de usuários e resultados: sem dados. | CONFIRMADO (uso); NÃO VERIFICADO (escala) |

## 2. Estrutura do repositório

| Caminho | Conteúdo | Observação |
|---|---|---|
| `frontend/` | App Next.js 16 (App Router), Dockerfile, `vercel.json`, scripts `.ts` de manutenção | App ativo |
| `frontend/app/(auth)/` | login, registro, redefinição de senha | |
| `frontend/app/(dashboard)/dashboard/` | 11 páginas: lista, lançamento, importação, conferência, conferência +45 dias, duplicidade, colaboradores, usuários, automação GDIS, backup, auditoria | |
| `frontend/app/api/users/` | Route Handlers de gestão de usuários (única parte que usa a chave administrativa, só no servidor) | |
| `frontend/lib/` | `api.ts` (~1.500 linhas, camada de dados), `permissions.ts`, `erros.ts`, `planilhaLucas.ts` (parser isolado), clientes Supabase | |
| `frontend/components/charts/` | Gráfico de rosca vendorizado (Bklit/Visx/Motion/Number Flow) | 14 arquivos |
| `supabase/migrations/` | 47 arquivos SQL (000 a 045), executados manualmente | Versionados; migrations novas passam a ser ignoradas pelo Git por decisão do responsável |
| `conector/` | Servidor Node/Express/Playwright (porta local 3334) | ~300 linhas |
| `docs/marca/` | Pacote de marca: logos SVG, ícones, tema CSS, componente `Logo.tsx` | |
| `CONTEXTO_GERAL.md` | Documento de contexto com ~840 linhas (modelo de dados, RPCs, telas, armadilhas, decisões) | Fonte principal; cruzada com o código |
| `backend/` | Resíduo, não é o backend ativo | Segundo o contexto |
| `docker-compose.yml`, `Dockerfile` | Deploy em contêiner, `output: "standalone"` | |

## 3. Funcionalidades (todas CONFIRMADAS por rota/arquivo e `CONTEXTO_GERAL.md`)

- **Lista de Medidores** (`/dashboard`, `page.tsx`, ~1.700 linhas): cinco indicadores (valor pendente, concluído, total, +45 dias, média de dias), rosca de situação, ranking Top 10 clicável, filtros combináveis (colaborador, supervisor, GC/GO, serial em lote, serviço, status, material, datas), tabela paginada com ordenação multi-coluna e exportação CSV, modal de detalhe/edição com histórico de reatribuição e log de atividades.
- **Lançamento manual** (`lancamento/page.tsx`): colaborador, data, material SAP e seriais (separados por vírgula ou faixa "A a B"), verificação de conflito por serial em tempo real; conflito vira reatribuição com histórico (commit `20077585` adicionou a faixa de seriais).
- **Importação** (`importacao/page.tsx`, ~1.950 linhas): cinco abas (GDIS, Atribuições, PC, TC, Lucas), leitura de XLSX/XLS/CSV no navegador, prévia com contagens e problemas antes de gravar, progresso em lotes.
- **Conferência** e **Conferência +45 dias**: vincular número de serviço ao serial; ocultar item (persistente e reversível); busca por serial.
- **Duplicidade**: detecta serviço com mais de um serial e serial em mais de uma linha; ações de substituir, desvincular, excluir e marcar revisado.
- **Gestão de colaboradores e de usuários**; **Backup completo em JSON** (11 tabelas); **Log de auditoria** (antes → depois por campo, com registro de acesso negado).
- **Automação GDIS** (`automacao-gdis/page.tsx` + `conector/conector.js`): consulta o serial instalado em cada serviço; relatório por rodada; gravação linha a linha em `automacao_gdis_log`.
- **Parser Lucas** (`lib/planilhaLucas.ts`): recuperação de dados históricos com ações NOVO/DATA e revisão, isolado de React.

## 4. Stack real

| Camada | Tecnologia | Fonte |
|---|---|---|
| Front-end | Next.js 16.2.6 (App Router, `output: "standalone"`), React 19.2, TypeScript 5, Tailwind CSS 4, Lucide | `frontend/package.json`, `next.config.ts` |
| Gráficos | Visx (group, shape, responsive), d3-shape, Motion 13, Number Flow — componentes vendorizados do Bklit UI | `package.json`, `components/charts/` |
| Planilhas | SheetJS (`xlsx`) no navegador | `package.json` |
| Back-end/dados | Supabase: PostgreSQL, RLS, RPCs, gatilhos, Auth (e-mail + senha) | `supabase/migrations/`, `lib/api.ts` |
| Rotas de servidor | Next.js Route Handlers (`/api/users`) com cliente administrativo só no servidor | `app/api/users/`, `lib/api-auth.ts` |
| Automação | Node + Express + Playwright (Edge), SSE para progresso | `conector/package.json`, `conector.js` |
| Deploy | Vercel (`vercel.json`) e/ou Docker (`Dockerfile`, `docker-compose.yml`) | arquivos de configuração; produção na Vercel por registro de memória |
| Variáveis de ambiente (só nomes) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `Dockerfile`, `docker-compose.yml`, `supabase-admin.ts` |
| Testes | **Nenhum arquivo de teste encontrado**; o manifesto não tem script `test` | CONFIRMADO (ausência) |
| Observabilidade | Log de auditoria no banco e log de rodadas da automação; sem ferramenta externa identificada | CONFIRMADO / sem evidência de APM |

## 5. Identidade visual

Existe e é própria: pacote em `docs/marca/`, tokens em `frontend/app/traceone-tema.css`, fontes Archivo e Atkinson Hyperlegible Mono carregadas em `app/layout.tsx`, componente `Logo.tsx` e `StatusMedidor.tsx`. Detalhes em `04-brand-and-design.md`. Qualquer processo criativo anterior ao pacote (pesquisa, moodboard, alternativas) **não está registrado** no repositório.

## 6. Histórico Git (CONFIRMADO)

86 commits entre 28/07/2026 e 06/11/2026 (aprox. 14 semanas), em 25 dias de atividade. Marcos visíveis: hierarquia de papéis e remoção de políticas permissivas (agosto), recuperação após o incidente de dados (setembro), vínculo por papel, trava no banco e auditoria (outubro), faixa de seriais no lançamento, reconferência cadastral e filtro de supervisores (novembro).

## 7. Pontos de atenção encontrados (também listados em `08-verification-report.md`)

1. Um arquivo de backup JSON de cerca de 32 MB na raiz do repositório está **rastreado pelo Git** e contém dados operacionais reais. Não foi aberto.
2. O `docker-compose.yml` contém a URL do projeto Supabase e a chave pública (anônima) em texto; a chave de serviço não está no arquivo. A chave anônima é pública por desenho, mas o arquivo não deve ser publicado.
3. A senha temporária padrão de novos usuários é uma constante no código (`DEFAULT_PASSWORD`), decisão explícita do responsável. Não publicar o valor.
4. Não há testes automatizados.
5. As 47 migrations (000 a 045) estão versionadas, mas o `.gitignore` passou a ignorar migrations novas por decisão do responsável; as próximas existirão só localmente. O fluxo de aplicação é manual (sem `db push`), então o histórico remoto não reflete as migrations.
6. Há 11 scripts de manutenção soltos na raiz de `frontend/` (diagnóstico, correção de RLS, importação); o próprio contexto pede que os descartáveis sejam apagados.
7. O layout não é responsivo para celular (a captura de login mobile existe; o restante, não).
