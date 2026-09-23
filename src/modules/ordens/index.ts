/**
 * API pública do módulo `ordens`. `agenda`/`financeiro` (Fase 4) devem
 * importar `WorkOrder`/uma futura `listOpenWorkOrdersForSelect` daqui,
 * nunca de `schema.ts`/`queries.ts` diretamente.
 */
export type { WorkOrder, WorkOrderItem } from "./schema.types";
export type { WorkOrderStatusFilter } from "./queries";
export { getWorkOrderDashboardSummary } from "./queries";
export { WORK_ORDER_STATUS_LABELS } from "./components/work-order-status-badge";
export { WorkOrderStatusBadge } from "./components/work-order-status-badge";
