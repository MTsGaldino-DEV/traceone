# 04 — Marca e design: TraceOne

Fontes: `docs/marca/` (LEIA-ME, logos SVG, ícones, `Logo.tsx`, `traceone-tema.css`), `frontend/app/traceone-tema.css`, `frontend/app/layout.tsx`, `components/StatusMedidor.tsx`, `CONTEXTO_GERAL.md` §12 e as seis capturas fictícias de `assets/screenshots/`. Cópias dos arquivos de marca estão em `assets/branding/`.

**Sobre o processo criativo:** o repositório traz o *resultado* (pacote de marca, tokens, componentes), mas não pesquisa, moodboards, alternativas descartadas nem justificativas de naming. O LEIA-ME da marca contém um roteiro de aplicação para o Claude Code, o que indica que o pacote foi produzido à parte e aplicado ao front-end depois (CONFIRMADO pelo documento; a autoria do pacote é NÃO VERIFICADA). Este case descreve o que foi feito, sem inventar etapas.

## 1. Marca

- **Nome:** TraceOne. "Trace" (rastro, rastrear) + "One" (o um, a unidade: um medidor de cada vez). Leitura de naming: INFERIDA; não há justificativa escrita no repositório.
- **Símbolo (CONFIRMADO, `CONTEXTO_GERAL.md` §12):** um "1" traçado como trilha de circuito. Começa em um anel vazio (medidor pendente) e termina em um ponto azul cheio (medidor concluído). Conta a jornada do medidor em uma forma.
- **Ponto final no nome:** o logotipo fecha com um ponto azul, ecoando o ponto do símbolo.
- **Variações em arquivo:** logo claro, logo escuro, logo mono (`currentColor`), símbolo claro e escuro, `icon.svg`, favicon, `apple-icon.png`, ícones 192 e 512, imagem Open Graph (com a frase "Cada medidor, da entrega ao técnico ao serviço executado.").
- **Código:** componente `Logo.tsx` com variantes `completo`/`simbolo` e temas `claro`/`escuro`/`mono`; texto convertido em curvas, sem dependência de fonte.
- **Descritor:** "Controle de medidores", em caixa normal (a tela de login e os metadados usam a mesma frase).

## 2. Paleta (tokens reais em `traceone-tema.css`)

| Token | Hex | Papel |
|---|---|---|
| Tinta | `#0F172A` | Texto principal, logotipo |
| Sinal | `#2563EB` | Ação principal, foco, ponto da marca |
| Sinal forte | `#1D4ED8` | Hover do botão principal |
| Sinal fundo | `#EFF6FF` | Item ativo do menu, linha selecionada |
| Sinal claro | `#60A5FA` | Ponto da marca sobre fundo escuro |
| Noite / alto / baixo | `#070C1F` / `#0D1640` / `#040810` | Login, barra lateral, degradê |
| Névoa | `#F8F9FA` | Fundo das páginas |
| Linha | `#E2E8F0` | Bordas |
| Aço / Aço claro | `#64748B` / `#94A3B8` | Texto secundário / ícones inativos (não usar em texto) |

**Status, cada um com texto, fundo e marcador próprios:**

| Status | Texto | Fundo | Marcador | Forma |
|---|---|---|---|---|
| Pendente | `#B45309` | `#FFFBEB` | `#F59E0B` | anel vazio |
| Revisão | `#6D28D9` | `#F5F3FF` | `#8B5CF6` | dois anéis |
| Concluído | `#047857` | `#ECFDF5` | `#10B981` | ponto cheio |
| Erro | `#B91C1C` | `#FEF2F2` | `#EF4444` | anel com barra |

O marcador do status repete a gramática do símbolo: **anel vazio = pendente, ponto cheio = concluído**. Isso é a decisão de design mais coerente do projeto: a marca e o dado usam a mesma metáfora. Também ajuda quem não distingue cores, porque a forma carrega o significado. (Ressalva: o status persistido é binário, pendente/concluído; "revisão" e "erro" existem no componente, mas têm uso mínimo ou nenhum, conforme o contexto.)

Cores ainda fora dos tokens (admitido no contexto): navy de ação secundária, borda da barra lateral, gradientes da tela de registro e variáveis do gráfico.

## 3. Tipografia (CONFIRMADO em `app/layout.tsx`)

- **Archivo** (com eixo de largura) em marca, títulos e interface.
- **Atkinson Hyperlegible Mono** (`font-codigo`) para **serial, matrícula, número de serviço GDIS e código SAP**. Justificativa registrada no contexto: números que precisam ser lidos sem ambiguidade. Nas capturas, os seriais aparecem em mono, e os valores em reais em Archivo com numerais grandes nos indicadores.
- Idioma da página: `pt-BR`.

## 4. Linguagem visual observada nas telas

| Elemento | Observação (a partir das capturas e do código) |
|---|---|
| Estrutura | Barra lateral escura (Noite) com 10 itens e rodapé de usuário (nome, papel, trocar senha, sair); conteúdo claro (Névoa) com cartões brancos de borda fina |
| Item ativo | Fundo azul-escuro com ponto azul à direita (substitui a seta do modelo padrão) |
| Login | Fundo Noite com degradê radial e textura de pontos, cartão branco centrado, logotipo sobre fundo escuro, botão em Sinal, link "Entrar com senha temporária" |
| Indicadores | Cinco cartões com ícone em tom suave, rótulo em caixa alta, valor grande e legenda; o indicador "+45 dias" usa vermelho como alerta |
| Rosca "Situação Geral" | Âmbar (pendentes) x verde (concluídos), total no centro, legenda com contagem e percentual |
| Ranking | Barras proporcionais, posições 1 a 3 destacadas, itens clicáveis para filtrar a tabela |
| Tabela | Serial em mono, selo de status com marcador, ações por ícone |
| Modal de detalhe | Dados somente leitura no topo, campos de edição, bloco de histórico de reatribuição, **linha do tempo** de eventos com pontos coloridos por tipo (cadastrado, editado, reatribuído, serviço vinculado, concluído) |
| Lançamento | Formulário em quatro passos numerados (colaborador, data, material SAP, seriais), seleção confirmada em cartões coloridos, campo de seriais aceita lista ou faixa |

## 5. Experiência e usabilidade (CONFIRMADO no código)

- Arquitetura de informação: um menu único por tarefa (Lista, Lançamento, Importar, Conferência, +45 dias, Duplicidade), cadastros ao centro, ferramentas de gestão ao final; Log de auditoria fora do menu, aberto pelo nome do usuário.
- Itens do menu variam por papel; o despachante só vê a Lista; rota proibida redireciona.
- Importação em etapas explícitas (leitura, consulta, revisão, aplicação) com prévia e progresso.
- Mensagens de erro com título e explicação, traduzidas do banco (`lib/erros.ts`).
- Filtros combináveis; qualquer mudança recarrega tabela e indicadores; exportação CSV respeita os filtros.
- Ranking clicável funciona como filtro, ligando visão executiva e operação na mesma tela.
- Troca de senha própria dentro do app e fluxo "Primeiro acesso".

## 6. Responsividade e acessibilidade

- **Não responsivo para celular** (a captura de login mobile existe; o restante do app não se adapta, conforme `LEGENDA.md`). A Automação GDIS é explicitamente desktop-only. O case deve ser apresentado como produto de desktop.
- Acessibilidade: escolha de fonte legível para códigos, rótulos de status com texto e forma (não só cor), `lang="pt-BR"`. Sem auditoria de contraste ou leitor de tela registrada; **NÃO VERIFICADO**.

## 7. Direção de arte para o case

Respeitar o produto: **tema Noite** (`#070C1F` com degradê radial e textura de pontos) para capa, transições e encerramento; **Névoa** (`#F8F9FA`) para quadros de interface; **Sinal** (`#2563EB`) como único acento de ação; âmbar e verde só quando falarem de status. Tipografia Archivo para títulos e texto; Atkinson Mono para qualquer serial, matrícula ou código mostrado em tipografia de apoio. Usar o ponto azul final da marca como recurso de pontuação gráfica e o anel-ponto como ícone de progressão (do pendente ao concluído). Evitar gradientes coloridos, ilustrações 3D e mockups de celular: o produto não é mobile.
