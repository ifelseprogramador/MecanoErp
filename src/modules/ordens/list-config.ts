import type { FilterField } from "@/components/list-filter-bar";
import { PERIOD_FILTER, pickOption, sinceFromParam } from "@/core/list-filters";
import { WORK_ORDER_SORT_OPTIONS, type WorkOrderSort, type WorkOrderStatusFilter } from "./queries";
import { WORK_ORDER_STATUS_LABELS } from "./components/work-order-status-badge";

/** Filtros e ordenação da lista de OS — UMA definição para os dois layouts. */
export const WORK_ORDER_FILTERS: FilterField[] = [
  {
    param: "status",
    allLabel: "Todas as situações",
    options: Object.entries(WORK_ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  { ...PERIOD_FILTER, allLabel: "Qualquer data de criação" },
];
export const WORK_ORDER_SORT_CHOICES = Object.entries(WORK_ORDER_SORT_OPTIONS).map(
  ([value, label]) => ({ value, label }),
);
export const WORK_ORDER_DEFAULT_SORT: WorkOrderSort = "number_desc";

export function parseWorkOrderListParams(sp: Record<string, string | string[] | undefined>) {
  return {
    search: typeof sp.q === "string" ? sp.q : undefined,
    status: pickOption(sp.status, WORK_ORDER_STATUS_LABELS) as WorkOrderStatusFilter | undefined,
    since: sinceFromParam(sp.periodo),
    sort: pickOption(sp.sort, WORK_ORDER_SORT_OPTIONS) as WorkOrderSort | undefined,
  };
}
export type WorkOrderListOptions = ReturnType<typeof parseWorkOrderListParams>;
