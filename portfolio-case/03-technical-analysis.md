# 03 — Análise técnica: TraceOne

Base: `frontend/package.json`, `next.config.ts`, `lib/api.ts`, `lib/permissions.ts`, `lib/erros.ts`, `lib/planilhaLucas.ts`, `app/api/users/`, `supabase/migrations/` (47 arquivos), `conector/conector.js` e `CONTEXTO_GERAL.md`. Nada foi executado. O conteúdo das migrations foi conferido por nomes de objetos e cabeçalhos, não linha a linha.

## 1. Arquitetura em uma frase

Front-end Next.js que conversa diretamente com o Supabase; a regra de negócio vive no banco (RPCs, gatilhos e políticas de linha), e um conector local automatiza o GDIS onde não há API. Diagrama: `assets/diagrams/01-arquitetura.md`. **CONFIRMADO.**

## 2. Stack e porquê

| Decisão | Evidência | Por que importa |
|---|---|---|
| Next.js 16 App Router, React 19, TS, Tailwind 4 | `package.json` | Base moderna; `output: "standalone"` permite contêiner enxuto e a mesma base roda na Vercel |
| Supabase (Postgres + Auth + RLS) | `lib/supabase.ts`, migrations | Autenticação e autorização no mesmo lugar dos dados; sem servidor de aplicação próprio para a maior parte das operações |
| Regra no banco, não na tela | RPCs `vincular_servico_medidor`, `reatribuir_medidor`, `get_medidores_metrics`, gatilhos `trg_*` | Qualquer cliente (web, Android, scripts) herda as mesmas regras |
| Chave administrativa só em Route Handlers | `lib/supabase-admin.ts`, `lib/api-auth.ts`, `app/api/users/` | Reduz a superfície de exposição; a rota valida o token e o papel antes de agir |
| Planilhas lidas no navegador | `xlsx` em `importacao/page.tsx` | Prévia imediata, sem enviar arquivo bruto ao servidor |
| Gráfico vendorizado em vez de biblioteca pronta | `components/charts/` (14 arquivos) | O contexto registra a troca: Recharts foi removido; a rosca animada usa Visx, Motion e Number Flow |
| Migrations em SQL manual | `AGENTS.md`, memória | Fluxo controlado pelo responsável; evita aplicação automática em banco com dados reais |

## 3. Modelo de dados (CONFIRMADO em `CONTEXTO_GERAL.md` §6 e migrations)

Tabelas principais: `profiles`, `tipos_de_medidores` (catálogo e valor em reais), `colaboradores`, `medidores_list` (tabela central), `servicos_report` (serviços do GDIS), `medidor_logs` (linha do tempo), `conferencia_45dias_ocultos`, `duplicidade_revisados`, `medidor_recuperacao_pendente`, `automacao_gdis_log`, `auditoria_log`. A view `vw_medidores_completo` junta medidor, colaborador e catálogo, expõe dias de atribuição calculados e exclui linhas reatribuídas.

Detalhes que mostram critério de modelagem:

- Valores em reais **nunca são digitados**: vêm do catálogo (`tipos_de_medidores.valor`).
- Matrícula normalizada para minúsculas por gatilho em três tabelas.
- Índice único parcial impede dois medidores `PENDENTE` com o mesmo serial.
- Reatribuição preserva histórico: a linha antiga vira `REATRIBUIDO` e a nova aponta para ela.
- `status_conferencia` é `TEXT` com restrição CHECK, não enum.

## 4. Camada de regras no banco

- **RPCs** (mais de 20 catalogadas em §8 do contexto): vinculação, reatribuição, duplicidade, métricas, conferência +45 dias, importações em lote (`importar_planilha_pc`, `importar_planilha_lucas`, `importar_servicos_forcado`), recuperação e consulta das rodadas da automação.
- **Gatilhos**: normalização de matrícula, atualização de timestamps, log por medidor (`fn_log_medidor_evento`), vinculação automática quando o medidor chega depois do serviço (`trg_auto_vincular_serial`), trava de vínculo por papel (`fn_trava_vinculo_servico`) e auditoria genérica em sete tabelas (`fn_auditoria`).
- **Erros próprios** (`TO403`, `TO404`, `TO409`, `TO422`) com título e explicação prontos para o usuário; `lib/erros.ts` (251 linhas) traduz também erros do Postgres para mensagens legíveis.
- **Métricas agregadas no banco**: `get_medidores_metrics` devolve indicadores e ranking em uma chamada, com os mesmos filtros da tabela. O contexto registra o motivo: paginar no cliente já causou contagem errada (2.832 linhas buscadas contra 2.479 únicas) por falta de `ORDER BY`.

## 5. Segurança (o que está comprovado)

| Item | Evidência |
|---|---|
| RLS em todas as tabelas, por papel, com função `get_user_role()` | Migrations 002, 018, 019, 045 |
| Remoção das políticas `allow_all_*` que liberavam acesso sem login | Migration 019; histórico em `CONTEXTO_GERAL.md` §5 |
| Trava de vínculo por papel no banco | Migration 045 (`trg_trava_vinculo_servico`) |
| Funções `SECURITY DEFINER` com `SET search_path = public` | Migrações 020/021; regra de ouro em §7 do contexto |
| Rotas administrativas exigem token e papel de gestão | `lib/api-auth.ts` |
| Log de auditoria imutável com antes/depois e registro de acesso negado | Migration 045; página `auditoria` |
| Proteção de rota por papel no layout | `app/(dashboard)/layout.tsx` redireciona quando o papel não é permitido |

Pontos fracos reconhecidos (para o relatório de verificação, não para o case): senha temporária padrão fixa para usuários novos (decisão explícita do responsável), ausência de testes automatizados, chave pública de API em `docker-compose.yml`.

## 6. Importação de planilhas (CONFIRMADO em `importacao/page.tsx` e `planilhaLucas.ts`)

- Cinco abas com regras distintas: **GDIS** (upsert de serviços, valida matrícula, caminho de importação forçada restrito por papel), **Atribuições** (cruza com o banco e separa devoluções, reatribuições e divergências), **PC** e **TC** (plano de vínculos e aplicação em lotes de 500 com progresso), **Lucas** (recuperação histórica com ações NOVO/DATA e revisão).
- Cabeçalhos identificados por aliases PT/EN e por posição de coluna, para resistir a arquivos com problema de codificação.
- Datas DD/MM tratadas explicitamente (bug anterior registrado no contexto).
- O parser Lucas é um módulo TypeScript separado de React (`parsePlanilhaLucas`, `montarPlanoLucas`), fácil de exercitar isoladamente. **Não há teste que o exercite no repositório.**

## 7. Automação GDIS (CONFIRMADO em `conector.js` e `automacao-gdis/page.tsx`)

- Servidor Express local com Playwright controlando o Edge; progresso em tempo real por Server-Sent Events.
- Endpoints: `/ping`, `/status-stream`, `/iniciar-sessao`, `/continuar-apos-captcha`, `/buscar-seriais`, `/cancelar`.
- O login exige captcha resolvido por uma pessoa; o robô então percorre as filas de Recuperação e Conferência com pausa de 1,2 s entre consultas.
- Cada rodada tem identificador e grava linha a linha em `automacao_gdis_log`, porque um lote grande pode levar horas e a aba pode fechar no meio (descrição do contexto).
- Restrições: só desktop, só na rede interna, só para Admin e Gestor. Não há integração oficial por API com o GDIS; o robô contorna essa ausência.

## 8. Integrações

| Integração | Natureza | Status |
|---|---|---|
| GDIS | Robô de navegação + importação de relatórios | CONFIRMADO |
| SAP | Código de material no catálogo e planilhas de atribuição | CONFIRMADO (por planilha, sem API) |
| Android (`traceone-android`) | Projeto irmão, lê via função de servidor | CONFIRMADO em memória; fora deste case |
| Central NEO | Porta telas do TraceOne com tokens próprios; usa segunda sessão | CONFIRMADO em memória; fora deste case |

## 9. Deploy e operação

- `vercel.json` com build em `frontend/`; `Dockerfile` multi-estágio (Node 20 Alpine, usuário sem privilégio, `standalone`) e `docker-compose.yml` na porta 3000.
- Produção na Vercel registrada na memória (publicação de 06/11/2026, com verificação de resposta HTTP 200 e do pacote publicado). Domínio não registrado no código.
- Rotinas de operação sobre dados reais seguem protocolo escrito: backup JSON prévio, IDs explícitos, contagem esperada, transação com trava e verificação posterior (memória de 05 e 06/11/2026). **Essa disciplina é uma evidência de maturidade operacional**, nascida do incidente de 16/09/2026.

## 10. Qualidade

| Item | Status |
|---|---|
| Lint (`eslint`) e build configurados | CONFIRMADO (scripts) |
| Testes automatizados | **Inexistentes** |
| Verificações pontuais em scripts locais fora do Git | Registradas na memória (não versionadas) |
| Tipagem TypeScript | `tsc --noEmit` passou em 06/11/2026 segundo a memória; nove erros `no-explicit-any` preexistentes em `lib/api.ts` |

## 11. Diferenciais técnicos defensáveis

1. **Autorização em camadas com a trava final no banco** (tela, RLS, gatilho, auditoria de negado).
2. **Conciliação com tolerância a ordem**: o serviço pode chegar antes do medidor; o gatilho resolve quando o medidor é lançado.
3. **Automação de um sistema legado sem API**, com captcha manual, retomada por rodada e log item a item.
4. **Importação com prévia e plano**: o usuário vê o que será criado, atualizado, ignorado e revisado antes de gravar.

## 12. Possibilidades de expansão (PLANEJADO / sugestões)

Planejado no contexto: tela de conflitos do `match_medidores`, histórico completo de reatribuições, notificações de +45 dias, limpeza periódica de serviços antigos. Sugestão minha (não planejada pelo projeto): cobrir `planilhaLucas.ts` e as regras de permissão com testes.
