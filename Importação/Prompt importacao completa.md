# Prompt para Claude Code — Importação inicial de dados (TraceOne)

## Contexto
Estamos migrando dados históricos para o Supabase do TraceOne (módulo de
controle de medidores). Os arquivos de importação estão na pasta `importacao/`
na raiz do projeto:

- `importacao/medidores_limpo.csv` — histórico consolidado de entrega/conclusão
  de medidores (5.807 linhas), já limpo e normalizado.
- `importacao/import-medidores.mjs` — script que popula `tipos_de_medidores`,
  `colaboradores` (parcial) e `medidores_list`.
- `importacao/colaboradores_limpo.csv` — lista completa de colaboradores (221
  linhas) com `supervisor`, `gc` e `go`.
- `importacao/update-colaboradores.mjs` — script que faz upsert de
  colaboradores com supervisor/gc/go.
- `importacao/PROMPT_CLAUDE_CODE.md` — notas técnicas detalhadas do primeiro
  script (mapeamento de colunas, observações sobre `#N/D`, ambiguidades já
  resolvidas manualmente etc.) — leia também esse arquivo antes de rodar.

## Objetivo
Rodar os dois scripts, em ordem, contra o Supabase real do projeto, validando
os resultados a cada etapa.

## Passos

1. **Confirmar o schema real**
   Abra a migration `001_initial_schema.sql` (ou equivalente já aplicada no
   Supabase) e confirme que os nomes de tabela/coluna usados nos scripts batem
   com o schema real:
   - `tipos_de_medidores`: `codigo_sap`, `valor`, `tipo`, `tipo_ligacao`
   - `colaboradores`: `matricula`, `nome`, `supervisor`, `gc`, `go`, `ativo`
   - `medidores_list`: `data_atribuicao`, `material_sap`, `serial`, `matricula`,
     `servico_gdis`, `status`, `data_conclusao`, `servico_campo`, `equipe`
   Ajuste os scripts `.mjs` se houver qualquer divergência de nome antes de
   rodar. Não prossiga sem essa confirmação.

2. **Preparar o ambiente**
   - Dentro de `importacao/`, rode `npm install @supabase/supabase-js csv-parse`.
   - Peça a Matheus (ou pegue do `.env` do projeto, se já configurado) as
     variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (Project Settings →
     API no painel do Supabase). Exporte-as no shell antes de rodar os
     scripts — nunca hardcode a service role key em nenhum arquivo versionado.

3. **Rodar a importação principal**
   ```
   cd importacao
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node import-medidores.mjs
   ```
   Isso popula `tipos_de_medidores` (11 linhas, com `tipo`/`tipo_ligacao` NULL
   por enquanto), `colaboradores` (136 linhas, com `gc`/`go` NULL por
   enquanto) e `medidores_list` (5.807 linhas, em lotes de 500).

   Valide ao final:
   - `SELECT COUNT(*) FROM tipos_de_medidores;` → esperado 11
   - `SELECT COUNT(*) FROM colaboradores;` → esperado 136
   - `SELECT COUNT(*) FROM medidores_list;` → esperado 5.807
   - `SELECT COUNT(*) FROM medidores_list WHERE status = 'PENDENTE';` →
     esperado 1.654

4. **Rodar o update de colaboradores**
   ```
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node update-colaboradores.mjs
   ```
   Isso atualiza `supervisor`/`gc`/`go` dos 136 já existentes e cria os ~85
   colaboradores adicionais que ainda não tinham medidor lançado.

   Valide ao final:
   - `SELECT COUNT(*) FROM colaboradores;` → esperado 221
   - `SELECT COUNT(*) FROM colaboradores WHERE gc IS NULL OR go IS NULL;` →
     esperado 0

5. **Reportar um resumo curto** (linhas inseridas/atualizadas por tabela,
   qualquer erro ou lote que tenha falhado, e qualquer divergência de schema
   encontrada no passo 1).

## Pendências conhecidas (não bloqueiam a importação)
- `tipo` e `tipo_ligacao` em `tipos_de_medidores` seguem `NULL` — Matheus vai
  enviar uma lista complementar depois para popular esses 11 registros via
  `UPDATE`.
- Este histórico não passou pelo `match_medidores()` — foi inserido direto em
  `medidores_list` já com status resolvido manualmente por Lucas no passado.
- Se `medidores_list.serial` tiver constraint UNIQUE e o script rodar duas
  vezes por engano, o segundo `insert` vai falhar — nesse caso, truncar a
  tabela antes de repetir, ou trocar para `upsert` com `onConflict: "serial"`.