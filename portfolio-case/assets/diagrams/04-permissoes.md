# Diagrama 04 — Matriz de permissões (verificado em `frontend/lib/permissions.ts` e `CONTEXTO_GERAL.md` §5)

| Capacidade | Admin | Gestor | Almox. 211 | Supervisor | Almoxarifado | Despachante |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Ler dados operacionais | sim | sim | sim | sim | sim | sim (só a Lista) |
| Lançar e reatribuir medidores | sim | sim | sim | sim | sim | não |
| **Vincular serviço GDIS** | sim | sim | sim | não | não | não |
| Forçar importação com matrícula não cadastrada | sim | sim | sim | não | não | não |
| Gerenciar usuários | sim | sim | não | sim | não | não |
| Backup, Automação GDIS, Log de auditoria | sim | sim | não | não | não | não |

```mermaid
flowchart LR
    T["Tela esconde o que o papel<br/>não pode fazer"] --> R["RLS por papel<br/>get_user_role()"]
    R --> G["Gatilho trg_trava_vinculo_servico<br/>erro TO403"]
    G --> L["Log de auditoria<br/>registra acesso negado"]
```

Princípio documentado no código: a tela esconde, mas a trava de verdade fica no banco.
