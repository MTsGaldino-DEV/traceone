# Contexto Geral do Projeto TraceOne
 
> Este documento contém a visão completa do sistema **TraceOne**, incluindo a arquitetura, regras de negócio, modelo de dados, rotas de API, estrutura do frontend/backend, funções, DTOs, segurança e guias para IAs (como o Claude) entenderem o projeto sem ambiguidades.
 
---
 
## 1. Visão Geral e Propósito do Projeto
 
### O que é o TraceOne?
O **TraceOne** é um sistema completo de gestão de almoxarifado, controle de estoque de insumos e rastreabilidade patrimonial de equipamentos vinculados a colaboradores.
 
### Qual o problema ele resolve?
Em empresas industriais, de tecnologia, serviços ou manutenção, existe uma constante dificuldade de rastrear:
1. **Quais insumos consumíveis** (ex: luvas, capacetes, uniformes, máscaras) foram entregues para cada colaborador e se o estoque geral atingiu o nível crítico.
2. **Quais bens patrimoniados** (ex: notebooks, multímetros, ferramentas de precisão) estão atualmente em posse de cada colaborador, quem entregou, quando foi devolvido ou se houve registro de perda.
### Pilares Fundamentais do Sistema
- **Dualidade de Itens**:
  - `CONSUMABLE` (Consumível): Controlado por saldo em estoque (`quantity`), com estoque mínimo (`minStock`), lote (`lotNumber`), validade (`expiresAt`) e unidade (`unit`). Cada entrega reduz o saldo em estoque.
  - `ASSET` (Ativo Patrimoniado): Item único com código de patrimônio (`patrimonyCode`) e número de série (`serialNumber`), cujo estado é controlado pela posse (`currentHolderId` apontando para o colaborador). Não possui quantidade numérica agregada.
- **Integridade de Histórico via Snapshots**:
  - Na tabela de movimentações (`stock_movements`), os campos `itemName`, `employeeName` e `employeeRegistration` são gravados como cópia estática (*snapshot*) no momento exato da movimentação. Mesmo que um colaborador mude de nome ou seja inativado, o registro histórico permanece inalterado para fins fiscais e operacionais.
- **Trilha de Auditoria Geral (`audits`)**:
  - Qualquer alteração crítica (autenticação, criação de itens, atualização, exclusão, entrega, devolução, perda ou baixa) gera um log imutável com o ID do usuário que realizou a ação, a entidade afetada, endereço IP e detalhes em JSON.
- **Controle de Acesso Baseado em Funções (RBAC - Role-Based Access Control)**:
  - `ADMIN`: Acesso total ao sistema, inclusive gestão de usuários e exclusão de colaboradores/itens.
  - `ALMOXARIFE`: Operação diária do estoque (cadastro de itens, colaboradores e execução de movimentações).
  - `GESTOR`: Leitura e consulta de relatórios, dashboards, itens e histórico sem permissão para alteração cadastral ou movimentações.
---
 
## 2. Tecnologias Utilizadas (Tech Stack)
 
### Backend (`/backend`)
- **Runtime & Linguagem**: Node.js (v24.x) + TypeScript (v5.7)
- **Framework Web**: NestJS (v11.0) com Express
- **Banco de Dados & ORM**: PostgreSQL 15 + Prisma ORM (v5.22)
- **Autenticação**: Passport JWT (`@nestjs/jwt`, `passport-jwt`) com `bcrypt` (10 rounds de salt)
- **Validação de Payload**: `class-validator` e `class-transformer` com `ValidationPipe` global ativado
- **Hospedagem em Produção**: Render (`https://traceone-backend.onrender.com`)
- **Porta Local**: 3001
- **Subdomínios CORS Permitidos**: `http://localhost:3000`, `https://traceone.vercel.app` e regex `/\.vercel\.app$/`
### Frontend (`/frontend`)
- **Framework**: Next.js (v16.2.6 - App Router)
- **Linguagem**: TypeScript (v5.x) + React (v19.2.4)
- **Estilização**: TailwindCSS (v4) com `@tailwindcss/postcss`
- **Ícones**: Lucide React (`lucide-react`)
- **Hospedagem em Produção**: Vercel (`https://traceone.vercel.app`)
- **Comunicação com API**: Fetch encapsulado em `lib/api.ts` apontando para `NEXT_PUBLIC_API_URL` (com fallback para Render)
- **Persistência de Sessão**: Token JWT armazenado em `localStorage` sob a chave `traceone_token`
---
 
## 3. Modelo de Banco de Dados (Prisma Schema)
 
O arquivo de schema está localizado em `backend/prisma/schema.prisma`.
 
### Enums
- `Role`: `ADMIN` | `ALMOXARIFE` | `GESTOR`
- `ItemType`: `CONSUMABLE` | `ASSET`
- `ItemStatus`: `ACTIVE` | `INACTIVE` | `DISCONTINUED`
- `EmployeeStatus`: `ACTIVE` | `INACTIVE` | `ON_LEAVE`
- `MovementType`:
  - `DELIVERY`: Entrega de item ao colaborador
  - `RETURN`: Devolução de item pelo colaborador
  - `LOSS`: Perda ou extravio registrado
  - `REPLACEMENT`: Substituição (devolução e entrega combinadas)
  - `WRITEOFF`: Baixa do sistema
- `AuditAction`: `LOGIN` | `CREATE` | `UPDATE` | `DELETE` | `DELIVERY` | `RETURN` | `LOSS` | `WRITEOFF`
### Entidades / Tabelas (`@@map`)
 
#### 1. `User` (`users`)
- `id` (String, PK - CUID)
- `name` (String)
- `email` (String, Único)
- `password` (String, Hash bcrypt)
- `role` (Enum `Role`, default `ALMOXARIFE`)
- `isActive` (Boolean, default `true`)
- `createdAt` (DateTime, default `now()`)
- `updatedAt` (DateTime, auto update)
- *Relações*: `movements` (`StockMovement[]`), `audits` (`Audit[]`)
#### 2. `Employee` (`employees`)
- `id` (String, PK - CUID)
- `name` (String)
- `registration` (String, Matrícula Única)
- `jobTitle` (String, Cargo)
- `sector` (String, Setor)
- `unit` (String, Unidade/Planta)
- `status` (Enum `EmployeeStatus`, default `ACTIVE`)
- `isActive` (Boolean, default `true`)
- `createdAt`, `updatedAt` (DateTime)
- *Relações*: `movements` (`StockMovement[]`), `assets` (`Item[]` sob relação `CurrentHolder`)
#### 3. `Category` (`categories`)
- `id` (String, PK - CUID)
- `name` (String, Nome Único)
- `description` (String, Opcional)
- `isActive` (Boolean, default `true`)
- `createdAt`, `updatedAt` (DateTime)
- *Relações*: `items` (`Item[]`)
#### 4. `Item` (`items`)
- `id` (String, PK - CUID)
- `name` (String)
- `description` (String, Opcional)
- `type` (Enum `ItemType`: `CONSUMABLE` ou `ASSET`)
- `categoryId` (String, FK -> `Category`)
- **Campos Consumível**:
  - `quantity` (Int, default 0)
  - `minStock` (Int, default 0)
  - `lotNumber` (String, Opcional)
  - `expiresAt` (DateTime, Opcional)
  - `unit` (String, default "un")
- **Campos Ativo (Patrimônio)**:
  - `patrimonyCode` (String, Único Opcional)
  - `serialNumber` (String, Opcional)
  - `currentHolderId` (String, FK -> `Employee`, Opcional)
- `status` (Enum `ItemStatus`, default `ACTIVE`)
- `isActive` (Boolean, default `true`)
- `createdAt`, `updatedAt` (DateTime)
- *Relações*: `category` (`Category`), `currentHolder` (`Employee`), `movements` (`StockMovement[]`)
#### 5. `StockMovement` (`stock_movements`)
- `id` (String, PK - CUID)
- `type` (Enum `MovementType`)
- `itemId` (String, FK -> `Item`)
- `employeeId` (String, FK -> `Employee`, Opcional)
- `userId` (String, FK -> `User`, operador que executou)
- `quantity` (Int, default 1)
- `notes` (String, Observações)
- **Campos Snapshot**:
  - `itemName` (String)
  - `employeeName` (String, Opcional)
  - `employeeRegistration` (String, Opcional)
- `createdAt` (DateTime, default `now()`)
- *Relações*: `item` (`Item`), `employee` (`Employee`), `user` (`User`)
#### 6. `Audit` (`audits`)
- `id` (String, PK - CUID)
- `userId` (String, FK -> `User`)
- `action` (Enum `AuditAction`)
- `entity` (String, ex: "employee", "item", "movement", "user")
- `entityId` (String, Opcional)
- `details` (Json, Opcional)
- `ip` (String, Opcional)
- `createdAt` (DateTime, default `now()`)
- *Relações*: `user` (`User`)
---
 
## 4. Arquitetura do Backend (`backend/src`)
 
### Estrutura de Pastas
```
backend/src/
├── app.module.ts
├── main.ts
├── audit/
│   ├── audit.controller.ts
│   ├── audit.module.ts
│   └── audit.service.ts
├── auth/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── dto/
│   │   └── login.dto.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── roles.guard.ts
├── categories/
│   ├── categories.controller.ts
│   ├── categories.module.ts
│   ├── categories.service.ts
│   └── dto/
│       └── create-category.dto.ts
├── dashboard/
│   ├── dashboard.controller.ts
│   ├── dashboard.module.ts
│   └── dashboard.service.ts
├── employees/
│   ├── dto/
│   │   └── create-employee.dto.ts
│   ├── employees.controller.ts
│   ├── employees.module.ts
│   └── employees.service.ts
├── items/
│   ├── dto/
│   │   └── create-item.dto.ts
│   ├── items.controller.ts
│   ├── items.module.ts
│   └── items.service.ts
├── movements/
│   ├── dto/
│   │   └── create-movement.dto.ts
│   ├── movements.controller.ts
│   ├── movements.module.ts
│   └── movements.service.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── users/
    ├── dto/
    │   └── create-user.dto.ts
    ├── users.controller.ts
    ├── users.module.ts
    └── users.service.ts
```
 
### Detalhamento dos Módulos e Funções
 
#### 1. Módulo Auth (`src/auth`)
- **`AuthService`**:
  - `login(dto: LoginDto, ip?: string)`: Autentica o usuário validando e-mail e hash da senha com `bcrypt`. Se bem-sucedido, gera o JWT assinado (`payload: { sub, email, role, name }`), grava log na auditoria (`action: 'LOGIN'`) e retorna `{ accessToken, user }`.
  - `getProfile(userId: string)`: Busca e retorna os dados do perfil do usuário logado.
- **`AuthController`**:
  - `POST /api/auth/login`: Ponto de entrada público para login de usuários.
  - `GET /api/auth/me`: Retorna os dados do usuário atual (Protegido por `JwtAuthGuard`).
- **Guards e Decorators**:
  - `JwtAuthGuard`: Garante token JWT válido no cabeçalho `Authorization: Bearer <token>`.
  - `RolesGuard`: Avalia as roles exigidas pela anotação `@Roles(...)` com `Reflector`. Se a role do usuário não for compatível, lança `ForbiddenException`.
  - `@CurrentUser()`: Injeta o usuário autenticado nos parâmetros do controlador.
  - `@Roles(...roles: Role[])`: Define quais roles têm permissão para acessar o endpoint.
#### 2. Módulo Colaboradores (`src/employees`)
- **`EmployeesService`**:
  - `create(dto: CreateEmployeeDto)`: Cadastra colaborador. Verifica se a matrícula (`registration`) já existe.
  - `findAll(search?: string, sector?: string, status?: string)`: Lista colaboradores ativos (`isActive: true`) com suporte a busca parcial por nome, matrícula ou setor. Retorna com relação `assets` (itens patrimoniados em posse).
  - `findOne(id: string)`: Retorna os dados detalhados do colaborador e seus bens sob custódia.
  - `getHistory(id: string)`: Retorna todas as movimentações de estoque associadas ao colaborador (`stockMovement.findMany({ where: { employeeId: id } })`).
  - `update(id: string, dto: Partial<CreateEmployeeDto>)`: Atualiza dados do colaborador.
  - `remove(id: string)`: Realiza deleção lógica (`isActive: false`, `status: INACTIVE`).
- **`EmployeesController`** (`/api/employees`):
  - `POST /` (`ADMIN`, `ALMOXARIFE`): Cria colaborador + log de auditoria.
  - `GET /` (`ADMIN`, `ALMOXARIFE`, `GESTOR`): Lista colaboradores com filtros.
  - `GET /:id` (`ADMIN`, `ALMOXARIFE`, `GESTOR`): Detalhes do colaborador.
  - `GET /:id/history` (`ADMIN`, `ALMOXARIFE`, `GESTOR`): Histórico de entregas/devoluções.
  - `PATCH /:id` (`ADMIN`, `ALMOXARIFE`): Atualiza cadastro + log de auditoria.
  - `DELETE /:id` (`ADMIN`): Desativa colaborador + log de auditoria.
#### 3. Módulo Itens (`src/items`)
- **`ItemsService`**:
  - `create(dto: CreateItemDto)`: Valida unicidade de `patrimonyCode` se for `ASSET`. Zera a quantidade se for `ASSET`.
  - `findAll(search?, type?, categoryId?, lowStock?)`: Lista itens ativos. Se `lowStock === 'true'`, filtra consumíveis onde `quantity <= minStock`.
  - `findOne(id: string)`: Retorna o item, categoria, detentor atual e as últimas 20 movimentações.
  - `update(id: string, dto: Partial<CreateItemDto>)`: Atualiza informações do item.
  - `remove(id: string)`: Realiza desativação lógica.
  - `adjustStock(id: string, delta: number)`: Altera a quantidade em estoque para consumíveis, impedindo saldo negativo.
- **`ItemsController`** (`/api/items`):
  - `POST /` (`ADMIN`, `ALMOXARIFE`): Cria item + log de auditoria.
  - `GET /` (`ADMIN`, `ALMOXARIFE`, `GESTOR`): Lista itens com suporte a busca e filtro por estoque baixo.
  - `GET /:id` (`ADMIN`, `ALMOXARIFE`, `GESTOR`): Busca item por ID.
  - `PATCH /:id` (`ADMIN`, `ALMOXARIFE`): Atualiza item + log de auditoria.
  - `DELETE /:id` (`ADMIN`): Desativa item + log de auditoria.
#### 4. Módulo Movimentações (`src/movements`)
- **`MovementsService`**:
  - `create(dto: CreateMovementDto, userId: string)`:
    - **Validações estritas**:
      - `DELIVERY` e `REPLACEMENT` exigem `employeeId`.
      - `RETURN` exige `employeeId`.
      - Se o item for `ASSET`: `DELIVERY` impede entrega se o bem já tiver um `currentHolderId`; `RETURN` exige que o `currentHolderId` seja igual ao `employeeId` informado.
    - **Transação Atômica (`prisma.$transaction`)**:
      1. Cria o registro de `StockMovement` salvando os campos snapshot (`itemName`, `employeeName`, `employeeRegistration`).
      2. Se `CONSUMABLE`: Atualiza o saldo em estoque (`DELIVERY`, `LOSS`, `WRITEOFF` decrementam; `RETURN` incrementa). Se a quantidade final for menor que 0, cancela a transação e lança `BadRequestException`.
      3. Se `ASSET`: Atualiza `currentHolderId` (`DELIVERY` define o colaborador; `RETURN`, `LOSS`, `WRITEOFF` definem como `null`).
    - Grava o evento na tabela de auditoria (`AuditService.log`).
  - `findAll(page, limit, type, itemId, employeeId)`: Retorna movimentações paginadas (`{ data, total, page, limit, totalPages }`).
- **`MovementsController`** (`/api/movements`):
  - `POST /` (`ADMIN`, `ALMOXARIFE`): Registra movimentação.
  - `GET /` (`ADMIN`, `ALMOXARIFE`, `GESTOR`): Consulta movimentações paginadas.
#### 5. Módulo Dashboard (`src/dashboard`)
- **`DashboardService`**:
  - `getStats()`: Executa em paralelo (`Promise.all`):
    - Total de colaboradores e colaboradores ativos.
    - Total de itens cadastrados.
    - Contagem mensal de entregas, devoluções e perdas.
    - Contagem de itens em estoque crítico (`quantity <= minStock` executada via `queryRaw` SQL nativa).
    - Contagem de itens com vencimento nos próximos 30 dias.
    - Contagem de ativos patrimoniados alocados.
    - Lista das 10 últimas movimentações.
- **`DashboardController`** (`/api/dashboard`):
  - `GET /`: Retorna o resumo consolidado de KPIs para o painel principal.
#### 6. Módulo Auditoria (`src/audit`)
- **`AuditService`**:
  - `log(params: LogParams)`: Registra ação executada por usuário (`userId`, `action`, `entity`, `entityId`, `details`, `ip`).
  - `findAll(page, limit)`: Lista registros de auditoria paginados em ordem decrescente de data.
- **`AuditController`** (`/api/audit`):
  - `GET /` (`ADMIN`): Endpoint exclusivo para administradores consultarem o histórico de auditoria.
#### 7. Módulo Usuários (`src/users`)
- **`UsersService`**:
  - `create(dto: CreateUserDto)`: Cria novo usuário do sistema aplicando hash bcrypt na senha.
  - `findAll()`: Retorna lista de operadores ativas.
  - `findOne(id: string)`: Retorna usuário por ID.
  - `update(id: string, dto: Partial<CreateUserDto>)`: Atualiza dados do usuário (com re-hash de senha se fornecida).
  - `remove(id: string)`: Desativa usuário (`isActive: false`).
- **`UsersController`** (`/api/users`):
  - Todos os endpoints exigem `@Roles(Role.ADMIN)`.
---
 
## 5. DTOs e Validações (`class-validator`)
 
1. **`LoginDto`**:
   - `email`: `@IsEmail()`
   - `password`: `@IsString()`, `@IsNotEmpty()`
2. **`CreateUserDto`**:
   - `name`: `@IsString()`, `@IsNotEmpty()`
   - `email`: `@IsEmail()`
   - `password`: `@IsString()`, `@MinLength(6)`
   - `role`: `@IsEnum(Role)`, `@IsOptional()`
3. **`CreateEmployeeDto`**:
   - `name`: `@IsString()`, `@IsNotEmpty()`
   - `registration`: `@IsString()`, `@IsNotEmpty()`
   - `jobTitle`: `@IsString()`, `@IsNotEmpty()`
   - `sector`: `@IsString()`, `@IsNotEmpty()`
   - `unit`: `@IsString()`, `@IsNotEmpty()`
   - `status`: `@IsEnum(EmployeeStatus)`, `@IsOptional()`
4. **`CreateCategoryDto`**:
   - `name`: `@IsString()`, `@IsNotEmpty()`
   - `description`: `@IsString()`, `@IsOptional()`
5. **`CreateItemDto`**:
   - `name`: `@IsString()`, `@IsNotEmpty()`
   - `description`: `@IsString()`, `@IsOptional()`
   - `type`: `@IsEnum(ItemType)` (`CONSUMABLE` | `ASSET`)
   - `categoryId`: `@IsString()`, `@IsNotEmpty()`
   - `quantity`: `@IsInt()`, `@Min(0)`, `@IsOptional()`
   - `minStock`: `@IsInt()`, `@Min(0)`, `@IsOptional()`
   - `lotNumber`: `@IsString()`, `@IsOptional()`
   - `expiresAt`: `@IsDateString()`, `@IsOptional()`
   - `unit`: `@IsString()`, `@IsOptional()`
   - `patrimonyCode`: `@IsString()`, `@IsOptional()`
   - `serialNumber`: `@IsString()`, `@IsOptional()`
   - `status`: `@IsEnum(ItemStatus)`, `@IsOptional()`
6. **`CreateMovementDto`**:
   - `type`: `@IsEnum(MovementType)`
   - `itemId`: `@IsString()`, `@IsNotEmpty()`
   - `employeeId`: `@IsString()`, `@IsOptional()`
   - `quantity`: `@IsInt()`, `@Min(1)`
   - `notes`: `@IsString()`, `@IsOptional()`
---
 
## 6. Frontend (Next.js App Router)
 
- **`lib/api.ts`**: Encapsula as chamadas de rede para a API NestJS. Trata montagem da URL (`${API_URL}/api${endpoint}`), inclui cabeçalho `Content-Type: application/json` e lança erros detalhados caso a resposta não seja `ok`.
- **`app/(auth)/login/page.tsx`**: Tela de login com design moderno, validação de campos, estado de loading animado e salvamento do JWT no `localStorage`. Redireciona para `/dashboard`.
- **`app/(dashboard)/layout.tsx`**: Layout protegido com barra lateral de navegação (Sidebar), indicador do usuário logado (extraído via payload JWT), botão de logout e cabeçalho responsivo.
- **`app/(dashboard)/dashboard/page.tsx`**: Painel visual de métricas contendo cards de KPIs em tempo real, estado de atividade recente, ações rápidas e indicação de status do backend.
---
 
## 7. Informações de Seed e Dados Iniciais (`prisma/seed.ts`)
 
Ao executar `npx prisma db seed`, o banco de dados é populado com os seguintes acessos e registros de teste:
 
### Usuários de Teste (E-mail / Senha / Perfil)
- `admin@traceone.com` / `admin123` (ADMIN)
- `almox@traceone.com` / `almox123` (ALMOXARIFE)
- `gestor@traceone.com` / `gestor123` (GESTOR)
### Categorias Cadastradas
- `EPI` (Equipamentos de Proteção Individual)
- `Uniforme` (Uniformes e vestimentas)
- `Ferramentas` (Ferramentas e equipamentos)
- `TI` (Equipamentos de tecnologia)
### Colaboradores de Teste
- Carlos Eduardo Silva (`MAT-001`) - Operador de Manutenção
- Ana Paula Santos (`MAT-002`) - Técnica de Segurança
- Roberto Lima (`MAT-003`) - Eletricista
---
 
## 8. Guias para IAs e Desenvolvedores (Boas Práticas de Manutenção)
 
1. **Alterações de Schema Prisma**:
   - Sempre que alterar `backend/prisma/schema.prisma`, rode `npx prisma generate` no backend para atualizar os tipos `@prisma/client`.
   - Lembre-se de atualizar os DTOs correspondentes em `src/<modulo>/dto/`.
2. **Novas Rotas de Movimentação**:
   - As movimentações NUNCA devem alterar tabelas de itens diretamente sem passar por `MovementsService.create`. O processo exige garantia de transação atômica (`$transaction`), snapshots dos dados e gravação de auditoria.
3. **Controle de Acesso**:
   - Em controladores NestJS, aplique `@UseGuards(JwtAuthGuard, RolesGuard)` na classe ou método, e restrinja as permissões com o decorator `@Roles(Role.ADMIN, ...)`.
4. **Resposta de Erro**:
   - Utilize as exceções padrão do NestJS (`BadRequestException`, `NotFoundException`, `ConflictException`, `ForbiddenException`, `UnauthorizedException`).