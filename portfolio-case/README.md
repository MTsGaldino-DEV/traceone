# Case de portfólio: TraceOne (web)

Material de portfólio produzido em 19/11/2026 a partir de leitura estática do repositório `traceone`. O app, o conector e o banco **não foram executados nem consultados**. Nenhum arquivo do projeto foi alterado, exceto uma seção curta ao fim de `MEMORIA_COMPARTILHADA.md`.

## Em uma linha

TraceOne rastreia medidores de energia entregues a técnicos de campo e os concilia com os serviços executados no sistema do cliente (GDIS), mostrando em reais o que ainda está parado e com quem.

## Como usar

| Para... | Abra |
|---|---|
| Entender o que existe e as evidências | `01-project-discovery.md` |
| Estratégia, público e proposta de valor | `02-product-strategy.md` |
| Arquitetura, segurança e engenharia | `03-technical-analysis.md` |
| Marca, paleta, tipografia e direção de arte | `04-brand-and-design.md` |
| Texto pronto para o site pessoal (12 seções) | `05-portfolio-case.md` |
| Montar o case no Behance (12 frames de 1400 px) | `06-behance-storyboard.md` |
| Saber que imagens capturar ou produzir | `07-visual-assets-plan.md` |
| Ver o que é fato, inferência ou pendência | `08-verification-report.md` |

Ordem de trabalho sugerida: ler o `08` (resolver pendências e autorizações) → ajustar `05` → produzir os assets do `07` → montar os frames do `06`.

## Assets

- `assets/screenshots/`: seis capturas fictícias (login, lista de medidores, detalhe, linha do tempo, lançamento) e `LEGENDA.md`. Cópias; os originais continuam em `_portfolio-prints/traceone/`.
- `assets/branding/`: logotipos, símbolos, ícones, imagem Open Graph e tokens CSS, copiados de `docs/marca/`.
- `assets/diagrams/`: quatro diagramas Mermaid verificados (arquitetura, ciclo do medidor, conciliação, permissões).
- `assets/mockups/`: vazia de propósito (o produto não é responsivo; ver `07`).

## Regras seguidas

1. Toda afirmação é CONFIRMADA, INFERIDA, NÃO VERIFICADA ou PLANEJADA (ver `08`); planejado não aparece como existente.
2. Sem métricas de negócio: não há medições no repositório.
3. Sem credenciais, valores de variáveis de ambiente, endereços internos, CPF, e-mails ou nomes de pessoas reais. Empresas clientes não são nomeadas e exigem autorização para publicação.
4. Direção de arte segue a identidade real do produto (Noite, Névoa, Sinal; Archivo e Atkinson Hyperlegible Mono).

## Principais pendências

Autorização para publicar (cliente, GDIS, capturas); autoria da marca; confirmação de produção e uso; ausência de testes automatizados; capturas faltantes (importação, auditoria, +45 dias, duplicidade, automação); revisão do arquivo de backup rastreado na raiz do repositório e do `docker-compose.yml`. Detalhes em `08`.
