/**
 * API pública do módulo `ordens`. Vazio de função por enquanto — nenhum
 * outro módulo depende de `ordens` ainda. `agenda`/`financeiro` (Fase 4)
 * devem importar `WorkOrder`/uma futura `listOpenWorkOrdersForSelect`
 * daqui, nunca de `schema.ts`/`queries.ts` diretamente.
 */
export type { WorkOrder, WorkOrderItem } from "./schema.types";
