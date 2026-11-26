# Memória compartilhada — TraceOne

Atualizada em 06/11/2026. Continuidade entre Claude e Codex.
Perfil de trabalho: [memória geral APPWEB](../MEMORIA_COMPARTILHADA.md).
Referências entre sistemas: [catálogo](../CATALOGO_FUNCIONALIDADES.md).
Se a pasta APPWEB não estiver disponível, este arquivo e o contexto local bastam
para começar; os caminhos de código abaixo são relativos a este repositório.

## Entrada e evidências

Ler `CONTEXTO_GERAL.md`, `frontend/AGENTS.md` e esta memória.
Fontes analisadas: contexto, manifestos, tela de importação, parser Lucas,
camada `frontend/lib/api.ts`, tokens e memórias locais do Claude.
A inspeção inicial de 23/10 foi estática; a atualização cadastral de 05/11
foi aplicada e conferida no banco e pela API, conforme registro abaixo.

## Propósito, arquitetura e design

Rastrear medidores entregues a técnicos, cruzar com serviços GDIS e tratar
pendências, reatribuições e exposição financeira. Serial é a referência prática.

- Aplicação em `frontend/`: Next 16.2.6, React 19, TS, Tailwind 4.
  Supabase Auth/Postgres, funções e gatilhos; gestão administrativa em
  `frontend/app/api/users/`. Conector Node/Express/Playwright em `conector/`.
- `frontend/AGENTS.md` exige consultar as guias locais da versão do Next em
  `node_modules/next/dist/docs/` antes de alterar código do framework.
- Tema: `frontend/app/traceone-tema.css`; Archivo no texto e Atkinson
  Hyperlegible Mono nos códigos. Tinta `#0F172A`, ação `#2563EB`,
  login Noite `#070C1F`, fundo `#F8F9FA`. Status têm texto/fundo/marcador próprios.
- Gráficos vendorizados Bklit/Visx/Motion/Number Flow em
  `frontend/components/charts/`; não presumir Recharts.
- Usar `permissions.ts` e verificações do banco; ocultar botão não basta.

## Funcionalidades de referência

| Pedido futuro | Onde estudar |
|---|---|
| “Importar relatório como TraceOne” | `frontend/app/(dashboard)/dashboard/importacao/page.tsx` e `frontend/lib/api.ts`. |
| Leitura, reconciliação e revisão de planilha antiga | `frontend/lib/planilhaLucas.ts` + `PlanilhaLucasTab`/`RevisaoLucas` na tela de importação. |
| Lista com filtros e seleção | `frontend/app/(dashboard)/dashboard/page.tsx`, `MultiSelectSearch.tsx`, `Pagination.tsx`. |
| Lançar/bipar caixas e faixas de seriais | `frontend/app/(dashboard)/dashboard/lancamento/page.tsx`. |
| Conferir vínculo e pendências antigas | páginas `conferencia` e `conferencia-45dias` sob `frontend/app/(dashboard)/dashboard/`. |
| Reatribuição, timeline e métricas | `frontend/lib/api.ts`, view/RPCs descritas no contexto, gráficos locais. |
| Automação GDIS desktop | página `automacao-gdis/page.tsx` e `conector/conector.js`; depende de rede interna. |

### Importação: o que preservar ao adaptar

Cinco abas reais: GDIS, Atribuições, PC, TC e Lucas. A tela aceita
XLSX/XLS/CSV, identifica cabeçalhos por aliases, converte datas e apresenta
prévia/plano com contagens e problemas antes de aplicar. Etapas de leitura,
consulta, revisão e aplicação são explícitas, com progresso/resultado.

- GDIS: serviços executados, validação de matrícula e caminho de importação forçada
  restrito a quem tem permissão.
- Atribuições: cruza com banco e distingue devoluções, reatribuições,
  divergências e matrículas inválidas. Matrícula inválida bloqueia sincronização.
- PC/TC: leitura compartilhada por configuração, plano de vínculos e aplicação em lotes.
- Lucas: recuperação histórica com ações NOVO/DATA e revisão por matrícula,
  material ou bloqueio. O cadastro atual prevalece em conflitos que a revisão
  não autorize. Parser separado de React, fácil de exercitar isoladamente.

Não copiar o comportamento de uma aba como se fosse a regra das cinco. Antes de
adaptar, definir o que será criado, atualizado, ignorado e exigirá revisão.

## Decisões de negócio e banco

- Matrículas normalizadas para minúsculo; terceiros com prefixo C não entram no
  cadastro conforme contexto. Um serial só pode ter uma linha PENDENTE.
- Reatribuição preserva histórico. TC/chave de aferição não usam a mesma
  detecção de duplicidade de medidores.
- Vínculo de serviço tem permissão própria; não confundir com edição geral.
  Consultar `frontend/lib/permissions.ts`, triggers e regras atuais.
- **Vincular ≠ importar (26/11/2026, migration 047):** ALMOXARIFADO vincula/troca
  serviço nas telas (Conferência, +45 dias, Lista, Duplicidade), mas NÃO importa.
  Abas GDIS/PC/TC/Lucas e importação forçada: só ADMIN, GESTOR, ALMOXARIFADO_211
  (`canImportarServico` / `pode_importar_servico()`). Em `servicos_report`,
  INSERT exige importar; UPDATE/DELETE exigem vincular. SUPERVISOR segue sem
  vincular. A 047 precisa ser rodada à mão por Matheus.
- **Workflow explícito do usuário:** migrations novas são SQL sequencial para
  execução manual. Não há aplicação automática. Por padrão Matheus roda no
  SQL Editor; se pedir execução pelo agente, memória registra
  `supabase db query --linked -f <arquivo>`.
- **Não usar `supabase db push` neste projeto:** histórico remoto não representa
  aplicações manuais. `supabase/migrations` está ignorada por decisão reconfirmada
  em 20/10; não oferecer versionamento nem forçar `git add -f`.
- Antes de DELETE/UPDATE em massa autorizado: backup JSON em `backup/` fora do
  Git, contagem esperada, IDs explícitos e trava se contagem divergir.
  Conferir cascatas em logs, ocultos da conferência e recuperação pendente.
  Houve perda de dados em 16/09; não “limpar” por filtro amplo.
- Credenciais administrativas só no servidor; não copiar chaves do contexto
  antigo para memória ou cliente.

## Integrações e documentos superados

- NEO porta telas com seus próprios tokens e usa uma segunda sessão no TraceOne.
  Alterar NEO não significa alterar este repositório ou seu banco.
- NEC oferece consulta de medidores por sua função do servidor, somente leitura.
- O Android já existe em `../traceone-android`: Expo/React Native, autenticação
  própria e ponte de leitura. A sugestão Kotlin/`supabase-kt` e acesso direto
  no contexto web são históricas, não a arquitetura implementada.
- Warefly exporta atribuições Excel; a memória dele registra pedido pendente
  para criar medidor na importação quando o serial ainda não existir.
  Não assumir que isso já está atendido por `AtribuicoesTab`.

## Comandos e verificação

Em `frontend/`: `npm.cmd run dev`, `npm.cmd run lint`, `npm.cmd run build`.
Não há script `test`/ `typecheck` no manifesto lido; há TypeScript instalado.
Conector tem `npm.cmd start` em sua própria pasta.
Não executar backup/restauração ou migrations como teste de documentação.

Nesta tarefa: memória criada, pontos de leitura adicionados, código preservado.
Preferência explícita recuperada do Claude: respostas curtas, com conclusão e
números relevantes; não repetir todo o contexto ao usuário.

## Atualização cadastral — 05/11/2026

- Pedido atual: usar `Importação/ATIVOS 211 - 031126 - copia.xlsx` como fonte
  mais recente dos dados dos colaboradores. Aba `Lista`, 251 registros.
- Cruzamento por `matricula_cemig`, normalizada para minúsculo: 228 matrículas
  válidas e únicas, sem colisões de nome nos novos cadastros.
- Aplicados 195 updates e 33 inserts em uma transação: 184 nomes corrigidos,
  195 supervisores atualizados e 4 mudanças para inativo. Os 228 registros
  conferidos correspondem a 224 ativos e 4 inativos.
- Preservados integralmente os 53 cadastros fora da lista, as matrículas,
  os vínculos e os campos GC/GO existentes, ausentes na planilha. Nos novos
  cadastros GC/GO ficaram nulos. Total após aplicação: 281 colaboradores.
- Backup prévio, plano com matrículas explícitas, linhas pendentes e resultado
  ficam em `backup/colaboradores-ativos211-2026-11-05T19-58-49-648Z.json`
  e seu `.result.json`, fora do Git. Script local de operação:
  `backup/atualizar-ativos211-20261105.cjs` (modos plan/apply/verify).
- Proteções: conferência do projeto de destino, hash da planilha, bloqueio de
  escritas concorrentes durante a transação, comparação com o backup,
  contagens exatas e rollback se houver divergência. FKs e triggers conferidos;
  sem alterações de schema, migrations ou código da aplicação.
- Verificação posterior por nova leitura SQL e pela API Supabase: todos os
  228 registros coincidem com nome, supervisor e situação da planilha; os 53
  registros fora dela e os demais campos existentes foram preservados.
- Pendência: 23 linhas ativas sem matrícula CEMIG não foram importadas; obter
  as matrículas para completar o cadastro. A relação está apenas no backup
  local, sem CPF/RG. Não reproduzir dados pessoais nesta memória.

## Reconferência cadastral — 06/11/2026

- Matheus confirmou que o novo pedido se refere ao arquivo com `copia` no nome:
  `Importação/ATIVOS 211 - 031126 - copia.xlsx`.
- Executado novamente o modo `verify` do script local com o backup de 05/11:
  hash e conteúdo da planilha permanecem iguais, e os 228 cadastros coincidem
  com nome, supervisor e situação esperados. Total de 281 colaboradores,
  com os 53 registros fora da lista e os demais campos preservados.
- Nenhuma nova gravação no banco foi necessária. Permanecem as 23 linhas sem
  matrícula CEMIG, pendentes de identificação para cadastro.

## Destino esclarecido: cadastro da Central NEO — 06/11/2026

- Matheus apontou que faltava matrícula Engelmig na aba Colaboradores da NEO.
  O cadastro dessa aba fica no CENTRAL-NEO, separado do TraceOne; a atualização
  anterior neste projeto não se propagava para lá.
- Atualizada a base da NEO com a mesma planilha: 196 updates e 55 inserts,
  cobrindo as 251 pessoas, todas com matrícula Engelmig. Importados também os
  campos compatíveis: nome, CPF, CEMIG quando disponível, cargo, admissão,
  supervisor e situação. Preservados logins, acessos e cadastros fora da lista.
- Na NEO as 23 pessoas sem CEMIG puderam ser incluídas pela matrícula Engelmig;
  a pendência de CEMIG registrada acima continua restrita ao TraceOne.
- Simulação com rollback, transação real e conferência por SQL/API passaram.
  Backup/plano/resultado e detalhes estão em `../central-neo/.tmp-faturamento/`
  e `../central-neo/MEMORIA_COMPARTILHADA.md`. Nenhuma nova escrita no banco
  do TraceOne, mudança de interface ou migration nesta correção de destino.

### Nomes corrigidos na NEO — 06/11/2026

- Matheus pediu retirar matrículas do início dos nomes e corrigir caracteres
  corrompidos, autorizando nomes sem acento. Seis nomes corrigidos apenas no
  CENTRAL-NEO; todos os 310 nomes conferidos sem prefixos ou caracteres não ASCII.
- Matrículas, demais dados e logins preservados. Backup e resultado em
  `../central-neo/.tmp-faturamento/backup-colaboradores-nomes-2026-11-06T11-04-38-286Z.json`
  e seu `.result.json`. Simulação com rollback e conferência posterior SQL/API
  passaram. Detalhes na memória da NEO. Nenhuma alteração no banco do TraceOne.

## Unificação pontual de supervisor no TraceOne — 06/11/2026

- Matheus pediu migrar os vínculos de um supervisor abreviado para seu nome
  completo. Causa confirmada: cinco cadastros fora da planilha anterior foram
  preservados com o rótulo antigo; os demais já usavam o nome completo.
- Corrigidos somente esses cinco vínculos em `colaboradores.supervisor` no
  TraceOne: 47 colaboradores no agrupamento final e zero no rótulo antigo.
  Total continua 281; os outros 276 cadastros foram preservados integralmente.
  Matrículas e demais campos dos cinco também preservados, exceto `updated_at`
  automático; auditoria normal mantida. Nenhum cadastro excluído ou mesclado.
- Backup/plano com matrículas explícitas e metadados de FKs/triggers em
  `backup/supervisor-unificacao-2026-11-06T11-19-57-217Z.json`; resultado em
  seu `.result.json`. Script `backup/unificar-supervisor-20261106.cjs`
  (plan/dry-run/apply/verify). Arquivos operacionais fora do Git.
- Simulação com rollback confirmado, transação com trava/contagem exata,
  conferência integral posterior por SQL e confirmação pela API passaram.
  Sem alteração de aplicação, schema, migration ou deploy.
- Os outros rótulos abreviados foram unificados no pedido complementar abaixo.
  A base própria da NEO foi consultada apenas para diagnóstico e não recebeu
  esta correção.
- A verificação do snapshot original de 05/11 representa o estado anterior:
  estes cinco vínculos agora diferem dele intencionalmente.

## Unificação dos demais supervisores no TraceOne — 06/11/2026

- Matheus ampliou o pedido para todos os demais supervisores abreviados.
  Correspondências com os quatro nomes completos existentes conferidas no
  cadastro e no cruzamento da importação anterior.
- Atualizados mais 45 vínculos (11, 23, 5 e 6 por agrupamento), resultando em
  totais de 50, 94, 31 e 42. Os 47 vínculos corrigidos antes foram preservados.
  Restam sete supervisores distintos, todos com nome completo, sem os cinco
  rótulos abreviados. Os 281 colaboradores permanecem cadastrados.
- Alterado somente `supervisor` e `updated_at` automático nos 45 alvos;
  outros 236 cadastros integralmente preservados. Nenhuma exclusão, mescla,
  alteração de matrícula, schema, aplicação, migration ou deploy.
- Backup/plano com IDs, FKs e triggers em
  `backup/supervisores-unificacao-2026-11-06T11-26-23-611Z.json`; resultado em
  seu `.result.json`. Script local
  `backup/unificar-demais-supervisores-20261106.cjs` (plan/dry-run/apply/verify).
- Simulação com rollback confirmado, transação com trava/contagem explícita,
  conferência integral posterior por SQL e conferência de todos os vínculos
  pela API passaram. NEO permanece sem escrita nesta correção.
- Este plano é a referência atual de verificação cadastral; snapshots anteriores
  representam estados anteriores às unificações solicitadas.

## Filtro de supervisores com medidores — 06/11/2026

- Matheus pediu ocultar da seleção os supervisores sem medidores vinculados.
  `frontend/lib/api.ts:getSupervisores` agora consulta `colaboradores` com
  `medidores_list!inner()`: exige vínculo existente sem carregar os medidores
  no resultado e mantém as permissões da sessão, ordenação e deduplicação.
- Opções baseadas na existência de qualquer medidor vinculado, independente
  de status ou página de resultados. Cadastro e vínculos permanecem intactos.
  A consulta atual retorna cinco supervisores, excluindo dois sem medidores.
- Verificação de leitura em `backup/verificar-filtro-supervisores-20261106.cjs`
  executa a função real contra a API e compara com SQL independente: falhou
  antes e passou após a alteração. Não houve escrita no banco.
- `tsc --noEmit` passou. ESLint de `lib/api.ts` mantém nove erros preexistentes
  de `no-explicit-any`, confirmados também na versão HEAD, fora da alteração.
- Publicado em produção na Vercel após autorização explícita de Matheus,
  commit `61242a95` enviado para `origin/main`. Commit contém somente
  `frontend/lib/api.ts`; mudanças preexistentes de instruções preservadas.
- `npm.cmd run build` passou, e a consulta real foi reconferida antes do envio.
  GitHub/Vercel confirmaram sucesso no ambiente Production para o SHA exato;
  `https://traceone-sigma.vercel.app/dashboard` respondeu HTTP 200 e seu JavaScript
  público contém a nova consulta `supervisor,medidores_list!inner()`.
- Evidência local em `backup/publicacao-filtro-supervisores-20261106.result.json`;
  verificação em `backup/verificar-publicacao-filtro-20261106.cjs`.
  Supervisores voltam automaticamente às opções quando houver medidores
  vinculados e a página for recarregada. Sem pendências nesta publicação.
  A cópia da interface da NEO não foi alterada.

## Case de portfólio — 19/11/2026 (Claude)

- Material em `portfolio-case/` (README, 01 a 08 .md e `assets/`): descoberta, estratégia, análise técnica, marca, case editorial, storyboard Behance, plano de assets e relatório de verificação. Leitura estática; nada executado, banco não consultado.
- `assets/` tem cópias das capturas fictícias de `_portfolio-prints/traceone/`, logos/tokens de `docs/marca/` e 4 diagramas Mermaid.
- Pendências: autorização para citar cliente/GDIS e publicar; autoria da marca; produção/uso; capturas faltantes (importação, auditoria, +45 dias, duplicidade, automação).
- Achados de segurança para revisão: backup JSON (~32 MB) rastreado na raiz do repo; `docker-compose.yml` com URL e chave pública do Supabase; sem testes automatizados.

## Importação GDIS "só 11 serviços" — 23/11/2026 (Claude)

- Diagnóstico (auditoria_log): não era bug. Dos 214 serviços do CSV, 203 já existiam (CONFERIDO) e só 11 eram novos (técnicos não cadastrados, entram sem matrícula/PENDENTE). A equipe excluía esses 11 após cada importação, então sempre voltavam como "novos".
- Correções: data do término gravada ao meio-dia UTC (antes 00:00Z aparecia com 1 dia a menos em UTC-3); prévia mostra "novos / já no sistema" (`contarServicosExistentes` em `lib/api.ts`); migration `046_forcado_preserva_matricula.sql` (COALESCE da matrícula no forçar) — rodada por Matheus à mão, verificada no banco.
- A `038` do repositório está defasada vs. banco (permissões ADMIN/GESTOR/ALMOXARIFADO_211); a 046 parte da versão do banco. `supabase/migrations/` é ignorado pelo git.
- `tsc --noEmit` passou. Datas já gravadas seguem com o deslocamento até nova importação.
