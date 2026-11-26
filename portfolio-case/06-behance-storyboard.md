# 06 — Storyboard Behance: TraceOne

**Formato:** módulos independentes de **1400 px** de largura, empilhados em sequência vertical (conferir limites atuais da plataforma antes de exportar). Altura livre por frame (sugestão 800 a 1400 px). Exportar em PNG/JPG sem texto embutido em tamanho menor que 24 px.

**Direção de arte:** a do próprio produto. Frames de abertura, transição e encerramento em **Noite** (`#070C1F`, degradê radial `#0D1640` → `#070C1F` → `#040810`, textura de pontos a 6% de branco). Frames de interface em **Névoa** (`#F8F9FA`). Acento único **Sinal** (`#2563EB`; `#60A5FA` sobre Noite). Âmbar `#F59E0B` e verde `#10B981` apenas para status. Títulos em Archivo (700), apoio em Archivo (400), códigos e seriais em Atkinson Hyperlegible Mono. Logotipos: `assets/branding/traceone-logo-escuro.svg` sobre Noite, `traceone-logo.svg` sobre claro.

**Regras de uso das imagens:** só as capturas reais de `assets/screenshots/` (dados fictícios). Não recriar telas. Não usar mockup de celular: o produto não se adapta a celular. Nos recortes, nunca ampliar a ponto de tornar legível dado que não seja claramente fictício.

Mapa de capturas disponíveis: **A** = `02-dashboard-estoque-desktop.png`, **A-full** = `02-dashboard-estoque-full-desktop.png`, **B** = `03-rastreio-item-desktop.png`, **C** = `03b-rastreio-historico-desktop.png`, **D** = `04-lancamento-movimentacao-desktop.png`, **D-full** = `04-lancamento-movimentacao-full-desktop.png`, **L** = `01-login-desktop.png`, **Lm** = `01-login-mobile.png`.

---

## FRAME 01 — CAPA (1400 × 900, Noite)
1. **Objetivo:** impacto e identificação imediata do produto e da categoria.
2. **Headline:** Cada medidor, da entrega ao técnico ao serviço executado.
3. **Copy de apoio:** TraceOne · Sistema web de rastreamento e conciliação de medidores · Produto, design e desenvolvimento full stack.
4. **Elementos visuais:** logotipo escuro grande, textura de pontos, linha fina em Sinal Claro partindo de um anel e terminando em um ponto (ecoando o símbolo).
5. **Screenshots:** A, recortada (indicadores e rosca), parcialmente saindo pela borda direita, com leve sombra.
6. **Composição:** assimétrica; texto à esquerda em dois terços, tela a 60% de largura na direita, cortada.
7. **Telas reais:** Lista de Medidores (`/dashboard`).
8. **Hierarquia:** logotipo > headline > tela > legenda de categoria.
9. **Montagem:** tela com borda de 1 px `#1E2942` e raio 12 px; legenda de uma linha em Aço Claro `#94A3B8` só se houver contraste mínimo 4,5:1 (senão usar `#CBD5E1`).

## FRAME 02 — INTRODUÇÃO (1400 × 900, Névoa)
1. **Objetivo:** explicar o produto a quem nunca o viu.
2. **Headline:** Um sistema que liga a entrega ao serviço.
3. **Copy:** "O TraceOne rastreia medidores de energia entregues a técnicos de campo e confere cada um com o serviço executado no sistema do cliente. Do cadastro da entrega à baixa, tudo fica registrado."
4. **Elementos:** três etapas em linha (Entrega → Serviço → Baixa) usando o anel, o traço e o ponto do símbolo como ícones; ficha lateral: Função · Web · 6 papéis de acesso · 11 telas.
5. **Screenshots:** nenhum (ou miniatura de L).
6. **Composição:** texto centrado largo, ficha em coluna estreita.
7. **Telas reais:** opcional L.
8. **Hierarquia:** headline > três etapas > ficha.
9. **Montagem:** muito espaço negativo; máximo 45 palavras no frame.

## FRAME 03 — O PROBLEMA (1400 × 1000, Noite → Névoa)
1. **Objetivo:** mostrar a dor sem usar números inventados.
2. **Headline:** Entrega e baixa viviam em lugares diferentes. [confirmar: "viviam" pressupõe o processo anterior; ver 08]
3. **Copy:** "Medidores têm valor. Quando a entrega e o serviço executado não se encontram, o item fica pendente, e o que fica pendente por muito tempo vira risco." Subfrase: "A conferência dependia de cruzar relatórios." [confirmar]
4. **Elementos:** diagrama de duas colunas desconectadas (Entrega ao técnico | Serviço no sistema do cliente) com uma interrogação sobre a ponte; ícone de relógio com a marca "45 dias".
5. **Screenshots:** nenhum; ilustração vetorial simples em Sinal e âmbar.
6. **Composição:** divisão vertical em duas metades que se conectam no frame seguinte.
7. **Telas reais:** nenhuma.
8. **Hierarquia:** headline > diagrama > frase de risco.
9. **Montagem:** fundo Noite no topo, transição suave para Névoa na base, que prepara a solução.

## FRAME 04 — A SOLUÇÃO (1400 × 1100, Névoa)
1. **Objetivo:** apresentar o raciocínio da solução e seu ciclo.
2. **Headline:** Cada medidor ganha uma história com começo e fim.
3. **Copy:** "A entrega abre a história como pendente. O serviço executado a fecha como concluída. No meio, cada mudança fica registrada."
4. **Elementos:** diagrama `assets/diagrams/02-ciclo-do-medidor.md` redesenhado em SVG: Pendente (anel âmbar) → Concluído (ponto verde), com ramo Reatribuído (violeta) e marcador +45 dias.
5. **Screenshots:** C recortada na linha do tempo, como prova de que a história é real.
6. **Composição:** diagrama à esquerda, recorte da linha do tempo à direita.
7. **Telas reais:** modal de detalhe do medidor.
8. **Hierarquia:** diagrama > recorte > headline.
9. **Montagem:** nos recortes, manter visíveis os pontos coloridos de evento; borrar nada além do necessário (já são dados fictícios).

## FRAME 05 — BRANDING (1400 × 1200, Noite)
1. **Objetivo:** mostrar a marca e sua lógica.
2. **Headline:** Um "1" que é um caminho: do anel ao ponto.
3. **Copy:** "O símbolo parte de um anel vazio, o medidor pendente, e chega a um ponto cheio, o medidor concluído. A mesma forma marca o status em toda a interface."
4. **Elementos:** símbolo grande (`traceone-simbolo-escuro.svg`), logotipo, paleta (Tinta, Sinal, Sinal claro, Noite, Névoa, Linha, Aço), amostra tipográfica (Archivo e Atkinson Mono com um serial de exemplo fictício), linha dos quatro status com seus marcadores.
5. **Screenshots:** nenhum; opcional recorte de selo de status da tabela (A).
6. **Composição:** grade de 12 colunas; símbolo ocupa 5; paleta e tipografia 7.
7. **Telas reais:** apenas o recorte opcional.
8. **Hierarquia:** símbolo > headline > paleta > tipografia > status.
9. **Montagem:** usar os hex reais; legendar cada cor com nome e papel. Não inventar versões, rascunhos ou alternativas de marca.

## FRAME 06 — UI SHOWCASE (1400 × 1500, Névoa)
1. **Objetivo:** exibir a interface real com qualidade editorial.
2. **Headline:** O estoque em campo, em uma tela.
3. **Copy:** "Cinco indicadores, uma rosca de situação e um ranking que filtra a tabela com um clique."
4. **Elementos:** legendas numeradas (1 indicadores, 2 situação, 3 ranking clicável, 4 filtros, 5 tabela).
5. **Screenshots:** A-full em largura total (1400 px com margem de 80 px), seguida de dois recortes ampliados (indicadores; ranking).
6. **Composição:** tela inteira no topo; recortes lado a lado abaixo.
7. **Telas reais:** `/dashboard`.
8. **Hierarquia:** tela inteira > legendas > recortes.
9. **Montagem:** reduzir a captura de 2880 px para o frame com nitidez; sombra suave; sem moldura de navegador.

## FRAME 07 — FUNCIONALIDADES (1400 × 2400, sequência de 3 a 4 blocos em Névoa)
1. **Objetivo:** destacar as funcionalidades que provam a proposta de valor.
2. **Headline:** O que o sistema faz por cada medidor.
3. **Copy por bloco:**
   - Rastreabilidade: "Cada medidor tem sua linha do tempo, gerada automaticamente."
   - Lançamento: "Faixas de seriais e conflitos resolvidos antes de gravar."
   - Importação: "Cinco formatos de planilha, com prévia antes de aplicar." (**depende de captura pendente**)
   - Acesso: "Quem entrega não dá baixa. A regra está no banco." (**depende de captura pendente ou usar diagrama 04**)
4. **Elementos:** ícones Lucide no estilo do produto; ligações finas entre bloco e recorte.
5. **Screenshots:** B (modal), C (linha do tempo), D (lançamento passo 3 e 4).
6. **Composição:** alternar texto/imagem esquerda e direita a cada bloco.
7. **Telas reais:** modal de detalhe; `/dashboard/lancamento`.
8. **Hierarquia:** título do bloco > recorte > frase.
9. **Montagem:** cada bloco tem altura própria e pode ser publicado separadamente; destacar com um retângulo em Sinal o ponto do recorte descrito.

## FRAME 08 — EXPERIÊNCIA (1400 × 1200, Névoa)
1. **Objetivo:** mostrar fluxo, navegação e consistência.
2. **Headline:** Um menu por tarefa, um sistema por papel.
3. **Copy:** "A navegação muda conforme o papel. O despachante vê a lista; o gestor, tudo. Erros chegam em português, com título e explicação."
4. **Elementos:** recorte do menu lateral; diagrama simples dos papéis (de `assets/diagrams/04-permissoes.md`); fluxo de importação em quatro etapas (leitura, consulta, revisão, aplicação) como faixa de ícones.
5. **Screenshots:** recorte do menu lateral de A; L em largura reduzida.
6. **Composição:** três colunas.
7. **Telas reais:** barra lateral e login.
8. **Hierarquia:** menu > papéis > importação.
9. **Montagem:** **não** apresentar Lm como responsividade. Se usada, legendar como "tela de acesso em celular"; o restante do app é desktop.

## FRAME 09 — TECNOLOGIA (1400 × 1300, Noite)
1. **Objetivo:** demonstrar profundidade técnica sem virar documentação.
2. **Headline:** As regras moram no banco.
3. **Copy:** "O navegador fala com o Supabase sob políticas de acesso por papel. Funções, gatilhos e auditoria garantem o dado, seja qual for o cliente. Um conector local automatiza o GDIS, que não tem API."
4. **Elementos:** diagrama `assets/diagrams/01-arquitetura.md` redesenhado em SVG com a paleta Noite; selos de stack (Next.js 16, React 19, TypeScript, Tailwind 4, PostgreSQL, Supabase, Playwright, Docker, Vercel).
5. **Screenshots:** nenhum.
6. **Composição:** diagrama central; selos em linha abaixo.
7. **Telas reais:** nenhuma.
8. **Hierarquia:** headline > diagrama > selos.
9. **Montagem:** só componentes do diagrama verificado; sem logos de terceiros que não estejam na stack real.

## FRAME 10 — DIFERENCIAIS (1400 × 1000, Névoa)
1. **Objetivo:** fixar os três diferenciais.
2. **Headline:** Três decisões que sustentam o produto.
3. **Copy:** "1. A regra vale em qualquer caminho. 2. Medidor e serviço podem chegar em qualquer ordem. 3. A marca e o dado usam a mesma metáfora."
4. **Elementos:** três colunas numeradas com ícone (cadeado, par de peças, anel→ponto).
5. **Screenshots:** recortes miniatura (A: selo de status; C: linha do tempo).
6. **Composição:** três colunas iguais.
7. **Telas reais:** selos de status e linha do tempo.
8. **Hierarquia:** número > frase curta > descrição de uma linha.
9. **Montagem:** textos de no máximo 25 palavras por coluna.

## FRAME 11 — RESULTADOS (1400 × 900, Névoa)
1. **Objetivo:** listar entregas e deixar claro o que é medido.
2. **Headline:** O que foi entregue.
3. **Copy:** "11 telas · 6 papéis · 5 formatos de importação · 47 migrations · conector de automação · pacote de marca. Em produção com dados reais." (verificar autorização antes de afirmar produção).
4. **Elementos:** faixa de números grandes em Archivo, rótulos em Aço.
5. **Screenshots:** nenhum.
6. **Composição:** faixa horizontal de seis números.
7. **Telas reais:** nenhuma.
8. **Hierarquia:** números > rótulos.
9. **Montagem:** **não** incluir métricas de negócio, porcentagens ou número de usuários. Se o responsável fornecer dados medidos e uma fonte, acrescentar um sétimo item.

## FRAME 12 — ENCERRAMENTO (1400 × 900, Noite)
1. **Objetivo:** fechar com assinatura e síntese.
2. **Headline:** Um medidor entregue, um serviço executado, e tudo o que aconteceu entre os dois, no lugar certo.
3. **Copy:** "Produto, design e desenvolvimento full stack, do problema à produção." + nome e contato do profissional [preencher com dados do responsável].
4. **Elementos:** símbolo animado em estático (anel → traço → ponto), logotipo, textura de pontos.
5. **Screenshots:** A em miniatura ao fundo com opacidade 12%, opcional.
6. **Composição:** centrada.
7. **Telas reais:** nenhuma (ou A de fundo).
8. **Hierarquia:** frase > assinatura > logotipo.
9. **Montagem:** frame mais calmo da sequência; sem botões de demo, já que o software é interno.

---

## Ordem final e ritmo

Noite (01) → Névoa (02) → transição (03) → Névoa (04) → Noite (05) → Névoa (06, 07, 08) → Noite (09) → Névoa (10, 11) → Noite (12). Alternância evita monotonia e destaca marca e arquitetura.

## Versão para desktop e mobile do Behance

Manter texto dos frames em 40 px (títulos) e 26 px (apoio) a 1400 px de largura, para ler bem quando a plataforma reduz a imagem em telas pequenas. Evitar recortes de tabela com letra menor que 14 px na imagem final.
