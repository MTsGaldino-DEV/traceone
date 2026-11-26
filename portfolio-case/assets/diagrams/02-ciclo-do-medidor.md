# Diagrama 02 — Ciclo de vida do medidor (verificado em `CONTEXTO_GERAL.md` §6 a §10 e migrations)

```mermaid
stateDiagram-v2
    [*] --> PENDENTE: Lançamento manual ou<br/>importação de atribuições
    PENDENTE --> CONCLUIDO: Serviço GDIS vinculado<br/>(manual, lote, gatilho ou robô)
    CONCLUIDO --> PENDENTE: Reaberto<br/>(desvincular serviço)
    PENDENTE --> REATRIBUIDO: Mesmo serial lançado<br/>para outro técnico
    REATRIBUIDO --> [*]: Linha histórica,<br/>some da lista e das métricas
    PENDENTE --> PENDENTE: Passa de 45 dias<br/>(entra na Conferência +45 dias)
```

Regras associadas (confirmadas): um serial só pode ter uma linha `PENDENTE` (índice único parcial); vincular serviço sempre conclui o medidor; cada mudança grava um evento no log do medidor por gatilho.
