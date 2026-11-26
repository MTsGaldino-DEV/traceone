# 07 — Plano de assets visuais: TraceOne

## 1. Inventário do que já existe

| Arquivo | Origem | Uso |
|---|---|---|
| `assets/screenshots/01-login-desktop.png`, `01-login-mobile.png` | Captura fictícia, 1440×900 @2x (2880×1800) | Frame 08/12 (login); a versão mobile só como "tela de acesso em celular" |
| `assets/screenshots/02-dashboard-estoque-desktop.png`, `-full-` | Idem | Frames 01, 06 |
| `assets/screenshots/03-rastreio-item-desktop.png`, `03b-...` | Idem | Frames 04, 07, 10 |
| `assets/screenshots/04-lancamento-movimentacao-desktop.png`, `-full-` | Idem | Frame 07 |
| `assets/screenshots/LEGENDA.md` | Legenda original das capturas | Referência |
| `assets/branding/` | Cópias de `docs/marca/`: 3 logotipos, 2 símbolos, `icon.svg`, `icon-512.png`, `opengraph-image.png`, `traceone-tema.css` | Frames 01, 05, 09, 12 |
| `assets/diagrams/01` a `04` | Mermaid verificado: arquitetura, ciclo do medidor, conciliação, permissões | Redesenhar em SVG com a paleta Noite/Névoa para os frames 04, 08, 09 |

**Regra geral para novas capturas:** usar um ambiente de teste com dados inventados (como nas capturas existentes, que seguem a `LEGENDA.md`). **Nunca capturar o banco de produção.** Se for preciso um ambiente novo, criar um projeto Supabase separado, popular com dados fictícios (nomes, seriais e valores inventados, e-mails em domínio reservado como `exemplo.com.br`) e apontar o front-end para ele. Não executar o conector contra o GDIS real para gerar imagens.

Padrão técnico das capturas: viewport 1440×900, escala 2x, tema padrão, zoom 100%, idioma pt-BR, navegador sem extensões visíveis, sem barra de endereço.

## 2. Capturas que faltam (prioridade de 1 a 3)

| # | Prioridade | Rota | Objetivo | Estado ideal da interface | Elementos que devem aparecer | O que ocultar/ficcionar | Frame |
|---|---|---|---|---|---|---|---|
| S1 | 1 | `/dashboard/importacao` (aba Atribuições) | Provar a importação com prévia | Planilha fictícia carregada, plano calculado, listas de Devolvidos, Reatribuições e Divergências visíveis, botão de aplicar ainda não clicado | Abas (GDIS, Atribuições, PC, TC, Lucas), contagens, resumo de problemas | Matrículas e nomes inventados; nunca usar planilha real | 07 |
| S2 | 1 | `/dashboard/importacao` (aba GDIS) | Mostrar validação de matrícula e prévia | Relatório fictício com uma matrícula não cadastrada para exibir o bloqueio e o aviso | Lista de matrículas faltantes; botão de forçar só se o papel permitir | Idem | 07 |
| S3 | 1 | `/dashboard/auditoria` | Provar auditoria (antes → depois) e acesso negado | Lista com eventos fictícios variados, incluindo um "Acesso negado" | Colunas quando, quem, papel, evento, campos alterados | Usuários inventados | 07/08 |
| S4 | 1 | `/dashboard/conferencia-45dias` | Mostrar a métrica crítica | Lista paginada com 10 a 15 itens, dias em destaque, campo de serviço e ação de ocultar | Ordenação por dias, busca por serial | Seriais e matrículas fictícios | 07 |
| S5 | 2 | `/dashboard/conferencia` | Mostrar o fluxo de vincular | Itens pendentes e a seção "Aguardando vinculação" | Botão copiar, campo de serial, Verificar vinculações | Idem | 07 |
| S6 | 2 | `/dashboard/duplicidade` | Mostrar detecção por serviço e por serial | Dois grupos expandidos, um âmbar (serviço) e outro violeta (serial) | Ações Nº medidor, Nº serviço, Desvincular, Marcar revisado | Idem; **não clicar em Excluir** | 07/10 |
| S7 | 2 | `/dashboard/automacao-gdis` | Mostrar a automação sem expor o GDIS | Etapa "aguardando captcha" ou histórico de rodadas **fictício**; endereço do GDIS e CNPJ/inscrição não visíveis | Etapas, progresso, relatório da rodada | **Ocultar qualquer IP, CNPJ, inscrição e número de serviço real.** Se não houver ambiente seguro, usar só o diagrama 01 | 07/09 |
| S8 | 2 | `/dashboard` com ranking clicado | Provar o filtro por técnico | Um técnico fictício selecionado no ranking, tabela filtrada, indicadores atualizados | Ranking com destaque, contagem de registros | Idem | 06/07 |
| S9 | 3 | `/dashboard/colaboradores` | Mostrar o cadastro com filtros | Lista com filtros de supervisor, GC e GO | Paginação, indicação de ativo/inativo | CPF, e-mails e matrículas reais | 08 |
| S10 | 3 | `/dashboard/usuarios` | Mostrar papéis | Lista com os seis papéis em dados fictícios | Rótulos de papel | E-mails fictícios | 08 |
| S11 | 3 | `/dashboard/backup` | Mostrar o backup embutido | Tela inicial com a lista de tabelas (sem gerar arquivo) | Botão de backup e progresso, se houver | — | 08 (opcional) |
| S12 | 3 | `/login` (aba de primeiro acesso) | Mostrar o fluxo de senha temporária | Tela de primeiro acesso | — | **Não mostrar o valor da senha temporária** | 08 (opcional) |

## 3. Variações das capturas existentes

| # | Descrição | Frame |
|---|---|---|
| V1 | Recorte 1400×700 dos cinco indicadores de `02` | 06 |
| V2 | Recorte do ranking com posições 1 a 3 destacadas | 06 |
| V3 | Recorte da rosca de situação | 06/10 |
| V4 | Recorte da linha do tempo de `03b` | 04/07/10 |
| V5 | Recorte do menu lateral com o item ativo | 08 |
| V6 | Recorte do quadro de quatro passos de `04` | 07 |
| V7 | Selo de status (pendente e concluído) ampliado, para a prova de que a forma carrega o significado | 05/10 |

## 4. Assets a produzir (arte original, sem inventar telas)

| # | Asset | Especificação | Frame |
|---|---|---|---|
| P1 | Fundo Noite com textura | 1400×N, degradê radial `#0D1640` → `#070C1F` → `#040810`, pontos de 1 px a cada 40 px em branco 6% (a mesma receita do tema) | 01, 03, 05, 09, 12 |
| P2 | Diagrama de arquitetura em SVG | A partir de `assets/diagrams/01-arquitetura.md`; fundo Noite; traços em `#60A5FA`; texto em branco | 09 |
| P3 | Diagrama do ciclo do medidor em SVG | Anel âmbar → ponto verde; ramo violeta; marcador "+45 dias" em vermelho | 04 |
| P4 | Diagrama de papéis e camadas de trava | Tela → RLS → gatilho → auditoria | 08/10 |
| P5 | Painel de marca | Símbolo, logotipo, paleta com hex, amostra Archivo e Atkinson Mono, quatro status com marcadores | 05 |
| P6 | Ícones de etapa | Entrega, serviço, baixa, usando anel, traço e ponto; Lucide para os demais | 02, 08 |
| P7 | Faixa de números | Seis números em Archivo 700, rótulo em Aço | 11 |
| P8 | Selos de stack | Texto em Archivo sobre pílula; sem logos de terceiros além dos oficialmente permitidos | 09 |
| P9 | Capa e encerramento | Composição conforme os frames 01 e 12 | 01, 12 |

## 5. Mockups

`assets/mockups/` fica vazia de propósito. Não há mockup de celular recomendado porque o app não é responsivo. Se desejar enquadramento de tela, usar apenas um plano com sombra, sem moldura de dispositivo.

## 6. Exportação e nomes

Nomear `frame-01-capa.png`, `frame-02-introducao.png`, e assim por diante. Exportar em sRGB, PNG para frames com texto e gradiente (evitar faixas de cor), largura final 1400 px. Manter os arquivos de origem (SVG, fonte do editor) em pasta própria.

## 7. Dados que nunca devem aparecer em nenhuma imagem

Nomes e matrículas reais; CPF, RG, e-mails reais; valores financeiros reais; números de série reais; números de serviço do GDIS reais; endereço interno do GDIS; chaves, URLs de projeto do banco e tokens; qualquer parte do arquivo `.env`; nomes de supervisores reais; a senha temporária padrão.
