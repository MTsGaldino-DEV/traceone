# TraceOne: pacote da marca

## O que tem aqui

| Pasta | Arquivo | Para quê |
|---|---|---|
| `logo/` | `traceone-logo.svg` | Logotipo principal, fundos claros |
| `logo/` | `traceone-logo-escuro.svg` | Logotipo sobre Noite e fundos escuros |
| `logo/` | `traceone-logo-mono.svg` | Uma cor (`currentColor`), impressão e documentos |
| `logo/` | `traceone-simbolo.svg`, `traceone-simbolo-escuro.svg` | Só o símbolo |
| `app/` | `icon.svg`, `favicon.ico`, `apple-icon.png`, `opengraph-image.png` | Convenções de arquivo do Next.js App Router (entram direto em `frontend/app/`) |
| `public/` | `icon-192.png`, `icon-512.png` | Ícones para manifest/PWA |
| `codigo/` | `Logo.tsx` | Componente React com as variantes `completo`/`simbolo` e temas `claro`/`escuro`/`mono` |
| `codigo/` | `traceone-tema.css` | Tokens do Tailwind v4: cores, status, fontes, degradê Noite |

Cores: Tinta `#0f172a`, Sinal `#2563eb`, Sinal claro `#60a5fa`, Noite `#070c1f`, Névoa `#f8f9fa`, Linha `#e2e8f0`, Aço `#64748b`.
Fontes: Archivo (marca, títulos, interface) e Atkinson Hyperlegible Mono (serial, matrícula, serviço GDIS, código SAP).

## Prompt para o Claude Code

Copie a pasta `traceone-marca/` para a raiz do repositório (`C:\APPWEB\traceone\traceone-marca`) e cole:

```
Aplique a identidade visual que está em ./traceone-marca (leia o LEIA-ME.md). Antes de mudar qualquer coisa, inspecione o frontend real: se não for Next.js App Router, adapte os passos (favicon e ícones via index.html, fontes via Google Fonts ou @fontsource). Faça um commit por passo, com mensagem em PT-BR, e me mostre um resumo curto de cada um.

1. Ícones: copie traceone-marca/app/* para frontend/app/ (substitua o favicon.ico do create-next-app) e traceone-marca/public/* para frontend/public/. Copie traceone-marca/logo/* para frontend/public/marca/. Apague next.svg, vercel.svg, globe.svg, window.svg e file.svg de frontend/public/ se não forem usados.
2. Tokens: copie traceone-marca/codigo/traceone-tema.css para frontend/app/ e importe logo depois de @import "tailwindcss" no globals.css. Remova o font-family: Arial do body e o bloco prefers-color-scheme: dark, que hoje não combina com o painel claro.
3. Fontes: no app/layout.tsx troque Geist/Geist_Mono por Archivo (com axes: ["wdth"], variable "--font-archivo") e Atkinson_Hyperlegible_Mono (variable "--font-atkinson-mono") do next/font/google. Se Atkinson_Hyperlegible_Mono não existir na versão instalada do Next, use next/font/local com o arquivo do Google Fonts. Mude lang para "pt-BR" e o metadata para title { default: "TraceOne", template: "%s | TraceOne" } e description "Controle de medidores: entrega ao técnico e conciliação com o GDIS."
4. Componente: copie traceone-marca/codigo/Logo.tsx para a pasta de componentes do frontend. Na barra lateral, troque o texto "TraceOne." por <Logo className="h-[22px] w-auto" /> e, no item ativo do menu, troque o ChevronRight por um ponto: <span className="ml-auto size-[7px] rounded-full bg-sinal" />. No login, use <Logo tema="escuro" className="mx-auto h-9 w-auto" /> e troque o descritor "Controle de Estoque" (maiúsculo) por "Controle de medidores" em caixa normal.
5. Cores: substitua hex fixos pelos tokens (#0f172a → tinta, #2563eb/blue-600 → sinal, blue-700 → sinal-forte, blue-50 → sinal-fundo, #f8f9fa → nevoa, #e5e7eb/#e2e8f0 → linha, #64748b → aco, #94a3b8/#9ca3af → aco-claro) e troque gray-* por slate-*. O fundo do login vira bg-noite-degrade com textura-pontos.
6. Status: onde houver status de medidor, use os tokens pendente/revisao/concluido/erro (texto, -fundo e -marca). Marcadores: anel vazio para Pendente, dois anéis para Revisão, ponto cheio para Concluído.
7. Códigos: células e campos de serial, matrícula, número de serviço GDIS e código SAP usam font-codigo.
8. Rode o build, confira as telas em localhost:3000 e me diga o que ficou pendente.
```
