# Diagrama 01 — Arquitetura (verificado em código e `CONTEXTO_GERAL.md` §2)

Apenas componentes confirmados. O app Android e a Central NEO são projetos separados que consomem o mesmo banco; ficam fora do diagrama.

```mermaid
flowchart LR
    subgraph Navegador["Navegador do usuário"]
        UI["Next.js 16 + React 19<br/>Tailwind 4 / Visx / Motion"]
    end

    subgraph Servidor["Next.js (Vercel ou Docker)"]
        API["Route Handlers<br/>/api/users"]
    end

    subgraph Supabase["Supabase"]
        AUTH["Auth<br/>e-mail + senha"]
        DB[("PostgreSQL<br/>RLS + RPCs + gatilhos")]
    end

    subgraph Local["Máquina do usuário (rede interna)"]
        CON["Conector Node + Express<br/>Playwright (Edge)"]
    end

    GDIS["GDIS<br/>sistema do cliente"]

    UI -- "sessão do usuário<br/>(chave pública)" --> AUTH
    UI -- "consultas e RPCs sob RLS" --> DB
    UI -- "token do gestor" --> API
    API -- "chave administrativa<br/>só no servidor" --> AUTH
    API --> DB
    UI -- "HTTP local + SSE<br/>(só desktop)" --> CON
    CON -- "navegação automatizada<br/>com captcha manual" --> GDIS
```

Leitura: a maior parte da regra de negócio mora no banco (RPCs, gatilhos, políticas de linha). O servidor Next.js só entra na gestão de usuários, onde é necessária a chave administrativa.
