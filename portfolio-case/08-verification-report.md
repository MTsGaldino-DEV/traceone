# 08 — Relatório de verificação: TraceOne

Data da análise: 19/11/2026. Método: leitura estática de arquivos. **Não foram executados** o app, o conector, build, lint, testes ou scripts, e **o banco não foi consultado**. Por isso nada abaixo foi observado em funcionamento; a classificação CONFIRMADO significa "visto em código, configuração ou documento consistente com o código".

## 1. Fontes consultadas

`MEMORIA_COMPARTILHADA.md` (06/11/2026), `AGENTS.md`, `CLAUDE.md`, `CONTEXTO_GERAL.md` (20/10/2026), `frontend/package.json`, `next.config.ts`, `Dockerfile`, `vercel.json`, `docker-compose.yml`, `lib/permissions.ts`, `lib/api.ts` (assinaturas), `lib/api-auth.ts`, `lib/supabase*.ts`, `lib/planilhaLucas.ts` (assinaturas), `app/layout.tsx`, `traceone-tema.css`, `components/Logo.tsx`, `StatusMedidor.tsx`, estrutura de `app/`, `supabase/migrations/` (lista de arquivos e objetos criados na 045), `conector/conector.js` (início, rotas), `docs/marca/`, histórico Git (contagem e datas), `INVENTARIO.md` (seção TraceOne), `LEGENDA.md` e as imagens de `_portfolio-prints/traceone/`.
Não lidos por escolha: `.env`, arquivos de `backup/` e de `Importação/`, o JSON de backup da raiz, `node_modules`.

## 2. Matriz de afirmações

### CONFIRMADO (código, configuração ou documento consistente)
- Produto web de rastreio de medidores com cruzamento contra serviços do GDIS.
- Stack: Next.js 16.2.6, React 19.2.4, TypeScript 5, Tailwind 4, Supabase JS, SheetJS, Visx, Motion, Number Flow, Lucide; conector Express + Playwright + CORS.
- Seis papéis e matriz de permissões em `permissions.ts`; `canVincularServico` restringe a Admin, Gestor e Almoxarifado 211.
- 11 páginas em `(dashboard)/dashboard/`, 3 em `(auth)`, 2 Route Handlers de usuários.
- Importação com cinco abas (GDIS, Atribuições, PC, TC, Lucas) no código (`TABS`).
- 47 migrations (000 a 045), incluindo funções de permissão, gatilho de trava de vínculo e tabela/gatilho de auditoria (migration 045).
- Conector local com rotas `/ping`, `/status-stream`, `/iniciar-sessao`, `/continuar-apos-captcha`, `/buscar-seriais`, `/cancelar`, pausa de 1,2 s e captcha manual.
- Backup completo de 11 tabelas na tela de backup.
- Identidade visual real: tokens, fontes, logotipos, componente de status.
- `output: "standalone"` e Dockerfile multi-estágio; `vercel.json` presente.
- Ausência de testes automatizados no manifesto e na árvore (nenhum `*.test.*`/`*.spec.*` fora de `node_modules`).
- 86 commits, de 28/07/2026 a 06/11/2026.

### INFERIDO
- O processo anterior era baseado em planilhas e conferência manual (indício: abas de importação e a planilha de recuperação histórica).
- Que o nome "TraceOne" combina "trace" e "one" e que o ponto final do logotipo ecoa o ponto do símbolo (a lógica do símbolo é documentada; a do nome, não).
- Que 45 dias é um prazo contratual ou de cobrança (o código o trata como métrica crítica; a origem da regra não está explicada).
- Que os papéis refletem equipes reais com responsabilidades distintas.
- Que a separação "quem entrega não dá baixa" nasceu de uma necessidade de controle interno.

### NÃO VERIFICADO (depende do responsável ou de execução)
- Que o sistema está em produção na data de hoje e o domínio de acesso. A memória registra publicação na Vercel em 06/11/2026 com resposta HTTP 200, mas isso não foi reverificado.
- Quantidade de usuários, frequência de uso, volume de medidores, ganhos de tempo, valores recuperados ou evitados.
- Quem criou o nome e a identidade visual (o pacote de marca existe, mas a autoria e o processo não estão registrados; o LEIA-ME sugere que o pacote foi produzido à parte e depois aplicado).
- Se o sistema foi criado para um cliente específico ou por iniciativa própria, e o vínculo contratual.
- Se o TraceOne roda hoje em Vercel, Docker ou ambos (há configuração para os dois; o contexto descreve Docker, a memória descreve Vercel).
- Funcionamento real do conector, do robô e das importações; acessibilidade (contraste, leitor de tela); desempenho.
- Se a descrição "uso diário" do contexto continua válida.
- O estado exato do banco (políticas e funções em vigor) em relação às migrations versionadas: o fluxo é manual e o contexto admite que o histórico remoto não representa as aplicações.

### PLANEJADO (não existe ainda; não pode aparecer como funcionalidade)
- Tela de resolução de conflitos do `match_medidores`.
- Histórico completo de reatribuições (hoje a última).
- Notificações para pendências acima de 45 dias.
- Rotina de limpeza de `servicos_report`.
- Layout responsivo para celular.
- Criação automática de medidor a partir da planilha de exportação de outro produto (pedido registrado na memória de outro projeto; não atendido aqui).

## 3. Divergências entre fontes

| Tema | Fonte A | Fonte B | Decisão neste case |
|---|---|---|---|
| App Android | `CONTEXTO_GERAL.md`: "a construir", com sugestão Kotlin e acesso direto ao banco | Memória (06/11): já existe como Expo/React Native em projeto irmão, com função de leitura | Seguir a memória; o Android fica fora do escopo e só é citado como projeto irmão |
| Abas de importação | Contexto §9.3 descreve GDIS, Atribuições e PC (e cita TC e Lucas depois) | Código: cinco abas | Seguir o código |
| Como aplicar migrations | Contexto: `npx tsx run_migration.ts` | Memória: SQL Editor ou `supabase db query`; proibido `db push` | Não afirmar método; dizer "manual" |
| Migrations no Git | Contexto: "fora do git a partir da 021" e passo futuro "voltar as migrations para o git" | Árvore: 47 arquivos rastreados; `.gitignore` ignora novos | Dizer que as existentes estão versionadas e as novas serão ignoradas |
| Hospedagem | Contexto e `docker-compose.yml`: Docker, porta 3000 | Memória e `vercel.json`: Vercel | Citar ambas as configurações, com produção na Vercel segundo a memória |
| Valor de "Total" nas capturas | Capturas mostram cifras fictícias | Código calcula a partir do catálogo | As cifras das imagens não devem ser citadas como resultado |

## 4. Questões de privacidade, segurança e publicação

Estes pontos não foram escritos no case e devem ser resolvidos antes de qualquer publicação.

1. **Arquivo de backup rastreado:** existe um JSON de cerca de 32 MB na raiz do repositório (`traceone-backup-...json`) que está no controle de versão. Pelo contexto, backups contêm dados reais. Não foi aberto. Recomenda-se revisar com o responsável e, se for o caso, removê-lo do histórico antes de qualquer compartilhamento do repositório. **Não alterado por esta tarefa.**
2. **`docker-compose.yml`:** contém a URL do projeto Supabase e a chave pública (anônima) em texto. A chave anônima é feita para ser pública, mas associá-la à URL em material de portfólio facilita varredura; **não foram copiadas** para o case. A chave de serviço não está no arquivo (vem de variável de ambiente).
3. **Senha temporária padrão:** `DEFAULT_PASSWORD` é uma constante fixa no código, decisão explícita do responsável. O valor **não** foi reproduzido. Não mostrar em capturas.
4. **Arquivo `.env` na raiz:** existe, está no `.gitignore`; não foi lido.
5. **Endereço interno do GDIS** está no `conector.js` e na documentação; **não aparece** no case. Não publicar.
6. **Dados pessoais e operacionais:** `Importação/`, `backup/` e o histórico da memória citam planilhas de colaboradores (a memória menciona campos como CPF em planilhas de cadastro), matrículas e supervisores reais. Nenhum desses dados foi copiado. As capturas em `assets/screenshots/` são fictícias, conforme `LEGENDA.md`, e os nomes que aparecem nelas devem ser conferidos pelo responsável contra pessoas reais.
7. **Nomes de empresas:** o cliente (concessionária de energia) e a empresa contratada aparecem na documentação e em nomes de campos do banco. O case usa termos genéricos ("concessionária", "empresa contratada"). **Para citar nomes, é necessária autorização.** O nome "GDIS" é do sistema do cliente e aparece no case porque é central para explicar o fluxo; confirmar se pode ser citado.
8. **Sistema interno:** o rodapé da tela de login diz "Sistema de uso interno". Verificar se há restrição contratual para publicar capturas ou o fluxo, mesmo fictício.
9. **Terceiros:** o design usa componentes de gráfico vendorizados do Bklit UI; checar a licença antes de destacá-los em publicação.

## 5. Limitações desta análise

- Nenhuma tela foi aberta além das seis capturas fornecidas. Descrições de telas sem captura (Conferência, Duplicidade, Auditoria, Automação, Backup, Colaboradores, Usuários) vêm do código e do contexto, não de observação visual.
- O conteúdo das migrations não foi lido por completo; foram conferidos nomes de arquivo e objetos da 045. Detalhes de RPCs seguem o contexto.
- Não foi possível confirmar se as migrations refletem o banco atual.
- Contagens (telas, papéis, migrations, tabelas, commits) são do estado do repositório em 19/11/2026.
- O número de "mais de vinte" RPCs vem do catálogo do contexto, não de uma contagem automática.

## 6. Alegações que o case NÃO faz (e não deve fazer sem prova)

Percentuais de ganho de produtividade; número de usuários ou equipes; valor financeiro recuperado; "substituiu o Excel" (processo anterior não documentado); "sem falhas" ou "100% de cobertura"; integração oficial com o GDIS ou SAP; uso de IA; aplicativo móvel como parte deste produto; responsividade; certificações ou conformidades (LGPD, ISO).

## 7. Itens marcados [confirmar] nos textos

| Onde | O que confirmar |
|---|---|
| `05` seção 01 | Autoria da criação da marca e do nome |
| `05` seção 09 | Se a ausência de testes pode ser mencionada ou se será resolvida antes |
| `05` seção 11 | Autorização para dizer "em produção com dados reais" |
| `05` seção 12 | Recorte exato de autoria e contexto de cliente |
| `06` frames 03 e 11 | "Viviam em lugares diferentes", processo anterior e produção |

## 8. Perguntas ao responsável (por prioridade)

1. O TraceOne foi feito para um cliente/empregador específico ou por iniciativa própria? Há restrição de confidencialidade para divulgar o caso, nome do cliente ou do GDIS?
2. Qual era o processo antes do sistema (planilhas? conferência manual?), e há algum número que possa ser divulgado (itens rastreados, tempo de conferência, valor sob controle, quantidade de usuários), com fonte?
3. O sistema está em produção hoje? Em qual hospedagem? Há uso diário e por quantas pessoas (pode ser uma faixa)?
4. Você criou o nome e a identidade visual (símbolo, paleta, tipografia)? Houve alternativas ou pesquisa que possa ser contada?
5. Qual foi a dificuldade de desenvolvimento mais difícil (por exemplo, o incidente de dados de 16/09, o robô do GDIS, os formatos de planilha)? Isso pode virar um bloco narrativo, se autorizado.
6. A regra de 45 dias vem de contrato ou de uma decisão interna?
7. Posso incluir o aplicativo Android como projeto irmão no case (ou em um case separado)?
8. Quer que o arquivo de backup da raiz e as chaves em `docker-compose.yml` sejam tratados antes de qualquer compartilhamento do repositório?
9. Pode-se gerar capturas novas (importação, auditoria, +45 dias, duplicidade) em um ambiente de teste com dados fictícios?
10. Há planos para testes automatizados? Se sim, vale registrar como evolução no case.
