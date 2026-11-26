# 02 — Estratégia de produto: TraceOne

Raciocínio: **Contexto → Problema → Consequência → Oportunidade → Solução.** Cada bloco indica o que é evidência e o que é leitura.

## Contexto (CONFIRMADO na documentação do projeto)

Uma empresa contratada de uma concessionária de energia entrega medidores a técnicos de campo. O técnico instala o equipamento e executa um serviço, que é registrado no GDIS, sistema web interno do cliente, acessível apenas pela rede local. Cada medidor tem número de série (a chave prática do rastreio), código de material SAP e valor em reais.

## Problema

A entrega acontece em um sistema (ou planilha) e a baixa acontece em outro (o serviço no GDIS). Nenhum dos dois, sozinho, responde à pergunta que importa: **este medidor entregue já virou serviço executado?**

## Consequência (INFERIDO a partir da regra "+45 dias" e dos KPIs em R$)

Medidores sem baixa ficam "no limbo". Passado um prazo (o sistema usa 45 dias como linha crítica), viram risco financeiro e demandam cobrança. Sem cruzamento confiável, essa conta depende de conferência manual item a item. O repositório não traz o processo anterior documentado nem números dessa perda; **não há valores reais a citar**.

## Oportunidade

Transformar o cruzamento em rotina de sistema: a entrega nasce como linha pendente, o serviço do GDIS entra por importação ou consulta automática, o vínculo conclui o item e o painel mostra, em reais e em dias, o que continua em campo e com quem.

## Solução (CONFIRMADO)

1. **Registrar a entrega** (lançamento manual com faixa de seriais ou importação da planilha de atribuições).
2. **Receber os serviços** do GDIS (importação de relatório, planilhas PC/TC, ou robô de consulta).
3. **Vincular** serial e serviço (manual, em lote ou automaticamente por gatilho quando o medidor chega depois do serviço).
4. **Concluir** o medidor e preservar o histórico (log por medidor, reatribuições, auditoria).
5. **Acompanhar** pelo painel (valor pendente, +45 dias, ranking por técnico) e tratar exceções (conferência, duplicidade).

## Proposta de valor (uma frase)

> TraceOne mostra, para cada medidor entregue, onde ele está e se o serviço que o instalou já foi executado, e transforma o que está parado em campo em um número de reais com nome, data e responsável.

Tagline do próprio produto (arquivo `opengraph-image.png` do pacote de marca): *"Cada medidor, da entrega ao técnico ao serviço executado."*

## Público e papéis (CONFIRMADO em `lib/permissions.ts`)

| Papel | O que faz no sistema | Leitura de negócio (INFERIDO) |
|---|---|---|
| Administrador / Gestor | Tudo, inclusive Backup, Automação GDIS e Log de auditoria | Dono da operação e da conciliação |
| Almoxarifado 211 | Escreve e **vincula serviço** | Quem fecha o cruzamento |
| Supervisor, Almoxarifado | Lançam e reatribuem; **não vinculam serviço** | Quem movimenta estoque, sem poder de baixa |
| Despachante | Só leitura da Lista de Medidores | Consulta rápida |

A separação entre "escrever" e "vincular serviço" é a regra de negócio mais característica: quem entrega não dá baixa. Está imposta por gatilho no banco (erro `TO403`), não só por esconder botão (CONFIRMADO em `CONTEXTO_GERAL.md` §5 e migration 045).

## Posicionamento

- **O que é:** ferramenta operacional interna, de uso diário, desenhada para decisões rápidas sobre reatribuição e pendência financeira.
- **O que não é:** produto de prateleira, sistema público ou plataforma multi-cliente. É uma solução sob medida para um fluxo específico (entrega física, GDIS, SAP).
- **Eixos de comunicação do case:** (1) rastreabilidade de ponta a ponta, (2) regra de negócio no banco, não só na tela, (3) automação onde o sistema do cliente não oferece integração, (4) identidade visual própria aplicada com rigor.

## Concorrência e mercado

Não há análise de concorrentes no repositório. **NÃO VERIFICADO**; o case não deve fazer comparações de mercado.

## Estado do produto

| Item | Status |
|---|---|
| Lista, lançamento, importação (5 abas), conferência, +45 dias, duplicidade, colaboradores, usuários, backup, auditoria, automação GDIS | CONFIRMADO (código) |
| Em produção com dados reais | CONFIRMADO por memória/commit; URL não registrada |
| App Android para técnicos (MVP em projeto separado) | CONFIRMADO como projeto irmão; fora do escopo deste case web |
| Resolução guiada de conflitos do `match_medidores` | PLANEJADO (contexto §16); a RPC existe, a tela não |
| Histórico completo de reatribuições (hoje o modal mostra a última) | PLANEJADO |
| Notificações para pendências acima de 45 dias | PLANEJADO |
| Limpeza periódica de `servicos_report` | PLANEJADO |
| Layout responsivo para celular | NÃO implementado (decisão por ora: uso em desktop) |

## Desafio de negócio x desafio de desenvolvimento

- **Negócio:** impedir que medidor entregue fique sem baixa quando as duas pontas vivem em sistemas separados, e dar ao gestor uma visão financeira diária.
- **Desenvolvimento:** integrar com um sistema legado inacessível de fora da rede (GDIS), importar planilhas de formatos diferentes com segurança, garantir regras de dados no banco e preservar histórico em operações destrutivas. Detalhes em `03-technical-analysis.md`.
