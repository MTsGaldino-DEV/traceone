# 05 — Case editorial: TraceOne

Texto pronto para adaptação ao site pessoal e ao Behance. Todas as afirmações têm lastro em `01` a `04`. Onde há dado a confirmar, aparece como **[confirmar]** e consta em `08-verification-report.md`. Não há métricas de negócio neste case porque não existem medições no repositório. Os números que aparecem (papéis, telas, migrations) são contagens do código.

---

## 01 — HERO / ABERTURA

**Projeto:** TraceOne
**Categoria:** Produto digital · Sistema web de operação · Full stack
**Headline:** Cada medidor, da entrega ao técnico ao serviço executado.
**Subheadline:** Um sistema que cruza o que foi entregue em campo com o que foi executado no sistema do cliente, e mostra em reais o que ainda está parado.
**Descrição resumida:** O TraceOne rastreia medidores de energia entregues a técnicos, concilia cada um com o serviço que o instalou e organiza as pendências antigas, as reatribuições e os casos duplicados. Foi desenvolvido de ponta a ponta: interface, banco de dados, regras de negócio, automação e aplicação da identidade visual. [confirmar se a criação da marca e do nome também foi do responsável; ver 08]
**Tags:** Produto · UX/UI · Design de marca · Next.js · TypeScript · PostgreSQL · Supabase · Automação · Regras no banco
**Imagem principal recomendada:** a Lista de Medidores (`02-dashboard-estoque-desktop.png`) em enquadramento amplo sobre fundo Noite, com o logotipo escuro. Alternativa: o modal com a linha do tempo (`03b`).

---

## 02 — VISÃO GERAL

O TraceOne é um sistema web interno de controle de medidores de energia. Ele é usado por gestores, supervisores, almoxarifado e despachantes de uma empresa contratada de distribuição elétrica.

O fluxo é simples de enunciar. Um medidor é entregue fisicamente a um técnico. O técnico o instala e executa um serviço, registrado no GDIS, o sistema do cliente. O TraceOne liga as duas pontas: cada entrega vira uma linha pendente e só deixa de ser pendente quando um serviço executado é vinculado ao número de série.

Com isso, a operação responde diariamente a perguntas que antes exigem cruzar fontes: quanto vale o que está em campo, com quem está, há quantos dias, e o que já virou serviço.

**O trabalho desenvolvido:** identidade visual e interface; painel de indicadores; lançamento de entregas por faixa de seriais; importação de planilhas e relatórios em cinco formatos; vinculação automática e manual entre medidor e serviço; conferências de pendências e duplicidades; seis papéis de acesso com regras impostas no banco; log de auditoria; backup; e um robô que consulta o GDIS onde não existe integração oficial.

---

## 03 — O PROBLEMA

**Contexto.** Medidores têm código, número de série e valor em reais. Eles saem do almoxarifado para técnicos de campo, e a prova de que foram usados está em outro lugar: o serviço executado, registrado no GDIS.

**Dor central.** Entrega e baixa vivem em sistemas diferentes. Nenhum dos dois responde sozinho se determinado medidor entregue já virou serviço.

**Consequência.** O que não é cruzado fica pendente, e o que fica pendente por muito tempo (a operação usa 45 dias como linha crítica) vira risco financeiro e cobrança. Sem uma visão única, o cruzamento depende de conferência item a item entre planilhas e relatórios.

**Limitações do cenário.** O GDIS só é acessível pela rede interna e não oferece integração para consulta em massa. Os dados chegam em planilhas de formatos diferentes. Técnicos trocam de equipe, e um mesmo medidor pode ser reatribuído. Houve ainda um incidente de perda de dados em setembro de 2026 que exigiu reconstruir informações a partir de várias fontes.

**Oportunidade.** Transformar a conciliação em rotina do sistema e dar ao gestor um número que ele consiga agir: valor pendente, quantos itens passaram de 45 dias e quem concentra o maior valor.

---

## 04 — O DESAFIO

**Operacional.** Conciliar duas fontes que não conversam, sem que a ordem de chegada importe: o serviço pode ser importado antes de o medidor ser lançado.

**De negócio.** Separar quem movimenta estoque de quem dá baixa. Quem entrega o medidor não deve poder concluí-lo, e essa regra precisava valer em qualquer caminho de entrada de dados, não só nos botões.

**Técnico.**
- Integrar com um sistema legado sem API, protegido por captcha e acessível apenas na rede interna.
- Importar cinco tipos de planilha com cabeçalhos instáveis, datas ambíguas e matrículas inválidas, sem gravar dado errado.
- Manter métricas corretas sobre milhares de linhas, apesar do limite de resultados por consulta do banco.
- Operar sobre dados reais com histórico preservado: reatribuições, exclusões e correções em massa precisam ser rastreáveis.

**Visual.** Criar uma identidade que não parecesse um painel genérico e que ajudasse a leitura: códigos longos que não podem ser confundidos, e um status que se entenda sem depender de cor.

---

## 05 — A SOLUÇÃO

O TraceOne trata o medidor como uma pequena história com início, meio e fim. A entrega abre a história (pendente). O serviço executado fecha (concluído). No meio, tudo o que acontece fica registrado.

**Como funciona**
1. **Registrar a entrega:** lançamento manual com lista ou faixa de seriais, ou importação da planilha de atribuições. Se o serial já está com outro técnico, o sistema mostra o conflito e a reatribuição preserva o histórico.
2. **Receber os serviços:** importação do relatório do GDIS e das planilhas de vínculos, ou consulta automática pelo robô.
3. **Vincular:** o serial encontra o serviço e o medidor passa a concluído. Se o medidor ainda não existe, o serviço fica aguardando e um gatilho do banco conclui o vínculo quando o medidor for lançado.
4. **Acompanhar:** painel com valor pendente, concluído e total, quantidade acima de 45 dias, média de dias em campo, rosca de situação e ranking por técnico.
5. **Tratar exceções:** Conferência +45 dias, Duplicidade, auditoria e backup.

**Decisão central de arquitetura.** As regras importantes moram no banco (funções, gatilhos e políticas de acesso), não na tela. A interface esconde o que o papel não pode fazer, mas quem decide é o banco. Qualquer cliente futuro, como o aplicativo Android que já existe como projeto à parte, herda as mesmas regras.

---

## 06 — EXPERIÊNCIA DO USUÁRIO

**Jornadas principais**
- *Gestor:* abre a Lista, lê os cinco indicadores, clica em um técnico no ranking e a tabela filtra por ele. Abre um medidor e lê a linha do tempo completa.
- *Almoxarifado:* lança caixas de medidores colando uma faixa de seriais; o sistema avisa conflitos antes de gravar.
- *Quem vincula serviços:* trabalha na Conferência, copia o número do serviço, digita o serial e vincula com Enter.
- *Importação:* escolhe a aba, carrega a planilha, revisa o plano com contagens e problemas e só então aplica.

**Navegação.** Um menu lateral por tarefa, que muda conforme o papel. O despachante vê apenas a lista. O log de auditoria fica fora do menu, aberto pelo nome do usuário, para não competir com o trabalho diário.

**Soluções de usabilidade**
- Filtros combináveis, com busca por nome ou matrícula, serial em lote e intervalos de data.
- O ranking funciona como filtro, unindo visão executiva e operação na mesma tela.
- Importação em etapas com prévia: o usuário vê o que será criado, atualizado ou ignorado antes de confirmar.
- Erros do banco traduzidos para título e explicação em português.
- Exportação CSV que respeita todos os filtros aplicados.

**Consistência.** Um único sistema de status (anel para pendente, ponto para concluído), tipografia própria para códigos e componentes reutilizados em todas as telas.

---

## 07 — IDENTIDADE VISUAL

A marca nasce da própria função do produto. O símbolo é um "1" desenhado como trilha de circuito: parte de um anel vazio e chega a um ponto azul cheio. O anel é o medidor pendente; o ponto, o medidor concluído. A jornada que o sistema controla está no logotipo.

A mesma ideia reaparece na interface: o marcador de status usa anel vazio para pendente e ponto cheio para concluído, de modo que a leitura não dependa só da cor.

**Cores.** Tinta (`#0F172A`) para texto, Sinal (`#2563EB`) para ação, Noite (`#070C1F`) para login e barra lateral, Névoa (`#F8F9FA`) para as páginas. Âmbar e verde ficam reservados a status.

**Tipografia.** Archivo na interface e Atkinson Hyperlegible Mono em serial, matrícula, número de serviço e código SAP, os dados que precisam ser lidos sem ambiguidade.

**Sistema.** Pacote de marca com cinco variações de logotipo e símbolo, ícones de aplicativo e imagem de compartilhamento; tokens de design em CSS; componente de logotipo e componente de status reutilizáveis.

---

## 08 — PRINCIPAIS FUNCIONALIDADES

### 1. Painel de estoque em campo (Lista de Medidores)
- **Problema que resolve:** ninguém enxerga em uma tela quanto valor está parado, com quem e há quanto tempo.
- **Como funciona:** uma única chamada ao banco entrega indicadores e ranking com os mesmos filtros da tabela; rosca de situação; ranking clicável; tabela com ordenação e exportação.
- **Benefício:** decisão diária sobre onde agir primeiro.
- **Evidência:** `app/(dashboard)/dashboard/page.tsx`, RPC `get_medidores_metrics`.
- **Tela ideal:** `02-dashboard-estoque-desktop.png`.

### 2. Rastreabilidade por medidor
- **Problema:** saber o que aconteceu com um item específico.
- **Como funciona:** modal com dados do equipamento, histórico de reatribuição e linha do tempo (cadastrado, editado, reatribuído, serviço vinculado, concluído) gerada automaticamente por gatilhos.
- **Benefício:** auditoria sem investigação manual.
- **Evidência:** tabela `medidor_logs`, `fn_log_medidor_evento`, `getMedidorLogs`.
- **Tela ideal:** `03-rastreio-item-desktop.png` e `03b-rastreio-historico-desktop.png`.

### 3. Lançamento por faixa de seriais com verificação de conflito
- **Problema:** registrar a entrega de caixas inteiras sem duplicar nem sobrescrever.
- **Como funciona:** colaborador, data, material SAP e seriais em lista ou faixa; cada serial é verificado e, havendo conflito, a reatribuição fecha a linha anterior e preserva o histórico.
- **Benefício:** entrada rápida de dados com integridade.
- **Evidência:** `lancamento/page.tsx`, RPCs `verificar_medidor_atribuido`, `reatribuir_medidor`; índice único de serial pendente.
- **Tela ideal:** `04-lancamento-movimentacao-desktop.png`.

### 4. Importação com prévia em cinco formatos
- **Problema:** dados chegam em planilhas com formatos e regras diferentes.
- **Como funciona:** leitura no navegador, cabeçalhos por apelido ou posição, plano com contagens e problemas, aplicação em lotes com progresso; cada aba tem regra própria.
- **Benefício:** reduz erro ao carregar grandes volumes.
- **Evidência:** `importacao/page.tsx`, `lib/planilhaLucas.ts`.
- **Tela ideal:** captura pendente da tela de Importar Relatório com planilha fictícia (ver `07`).

### 5. Controle de acesso com trava no banco
- **Problema:** quem entrega medidores não deve dar baixa.
- **Como funciona:** seis papéis; permissão de vincular serviço separada de editar; gatilho recusa a gravação sem permissão, em qualquer caminho; tentativas negadas entram na auditoria.
- **Benefício:** segregação de funções que não depende da interface.
- **Evidência:** `lib/permissions.ts`, migration 045.
- **Tela ideal:** captura pendente do Log de auditoria com dados fictícios.

### 6. Automação GDIS
- **Problema:** o sistema do cliente não tem integração para descobrir o serial instalado em cada serviço.
- **Como funciona:** conector local controla o navegador, o usuário resolve o captcha, o robô percorre as filas e registra cada consulta por rodada.
- **Benefício:** substitui consulta manual repetitiva em lotes grandes.
- **Evidência:** `conector/conector.js`, `automacao-gdis/page.tsx`, tabela `automacao_gdis_log`.
- **Tela ideal:** captura pendente da tela de Automação GDIS (sem dados reais; depende de ambiente fictício) ou diagrama de arquitetura.

---

## 09 — ENGENHARIA E ARQUITETURA

**Stack.** Next.js 16 e React 19 com TypeScript e Tailwind 4 no front-end; Supabase (PostgreSQL, autenticação e políticas de linha) como camada de dados; Node, Express e Playwright no conector de automação; Docker e Vercel no deploy.

**Arquitetura.** O navegador fala direto com o Supabase sob as políticas de acesso. Um pequeno conjunto de rotas de servidor cuida da gestão de usuários, único ponto em que a chave administrativa é usada. O conector local roda na máquina do operador, dentro da rede do cliente.

**Decisões que merecem destaque**
- Regras no banco: mais de vinte funções, gatilhos de log, vínculo automático e auditoria, e trava de permissão.
- Métricas agregadas no banco, após um problema real de contagem com paginação no cliente.
- Importações em lotes, com prévia e plano antes de gravar.
- Gráfico animado vendorizado, escolhido em vez de adicionar uma biblioteca completa de componentes.
- Operações sobre dados reais com backup prévio, IDs explícitos, contagem esperada e reversão se algo divergir.

**Dados.** Onze tabelas operacionais e de apoio, uma view de leitura, 47 migrations em SQL aplicadas manualmente.

**Segurança.** Políticas por papel em todas as tabelas, funções privilegiadas com caminho de busca fixo, log de auditoria imutável, chave administrativa restrita ao servidor.

**Qualidade.** Lint e build configurados; sem suíte de testes automatizados. [confirmar se há planos para isso, para decidir se esta frase entra na publicação]

---

## 10 — DIFERENCIAIS

1. **Regra de negócio imposta no banco.** A separação entre quem movimenta e quem dá baixa vale para tela, importação e qualquer cliente futuro. Isso protege o dado, não só a interface.
2. **Conciliação que não depende da ordem.** Medidor e serviço podem chegar em qualquer sequência; um gatilho fecha o vínculo quando o par se completa.
3. **Marca e dado falam a mesma língua.** O símbolo (anel até o ponto) e o marcador de status usam a mesma metáfora, e os códigos têm tipografia própria. A identidade não é aplicada à tela, está no modelo mental do produto.

(Menção adicional, de menor peso: automação de um sistema legado sem API, com captcha manual e registro por rodada.)

---

## 11 — RESULTADOS E ENTREGAS

**Entregas comprovadas**
- Aplicação web com 11 telas operacionais e de gestão, 6 papéis de acesso e autenticação própria.
- Importação em 5 formatos, com prévia e aplicação em lotes.
- Banco com 47 migrations, funções, gatilhos, políticas de acesso e auditoria.
- Conector de automação do GDIS com acompanhamento em tempo real.
- Pacote de marca completo e sistema de design em tokens e componentes.
- Backup completo em JSON de 11 tabelas, dentro do próprio sistema.
- Publicação em produção na Vercel, com dados reais. [confirmar autorização para dizer isso publicamente]
- Cerca de 14 semanas de desenvolvimento registradas no Git (28/07 a 06/11/2026, 86 commits).

**Resultados mensurados**
Não há métricas verificáveis no repositório. Nenhum percentual, economia ou número de usuários deve ser divulgado sem confirmação do responsável.

**Benefícios esperados (não medidos)**
- Menos alternância entre planilhas e sistemas para conciliar entrega e serviço.
- Visibilidade diária do valor em campo e dos itens acima de 45 dias.
- Rastro de quem fez o quê, útil para cobranças e conferências.

---

## 12 — ENCERRAMENTO

O TraceOne reúne, em um único trabalho, entendimento de um problema operacional, desenho de marca e interface, modelagem de dados, regras de negócio no banco, integração com um sistema fechado e a disciplina de operar sobre dados reais. Foi construído da interface e do banco até a publicação em produção.

**Frase de encerramento:** *Um medidor entregue, um serviço executado, e tudo o que aconteceu entre os dois, no lugar certo.*

**Papel profissional demonstrado:** produto, design, front-end, back-end, banco de dados, automação e operação em produção, conduzidos por uma pessoa. [confirmar o recorte exato de autoria e o contexto de cliente]
