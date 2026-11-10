import type { FilterField } from "@/components/list-filter-bar";
import { PERIOD_FILTER, pickOption, sinceFromParam } from "@/core/list-filters";
import { CUSTOMER_SORT_OPTIONS, type CustomerSort } from "./queries";

/**
 * Filtros e ordenação da lista de clientes — UMA definição para os dois
 * layouts (tela formal e modo Fácil), para nunca divergirem.
 */
export const CUSTOMER_FILTERS: FilterField[] = [
  {
    param: "type",
    allLabel: "Todos os tipos",
    options: [
      { value: "pf", label: "Pessoa física" },
      { value: "pj", label: "Pessoa jurídica" },
    ],
  },
  { ...PERIOD_FILTER, allLabel: "Qualquer data de cadastro" },
];
export const CUSTOMER_SORT_CHOICES = Object.entries(CUSTOMER_SORT_OPTIONS).map(
  ([value, label]) => ({ value, label }),
);
export const CUSTOMER_DEFAULT_SORT: CustomerSort = "created_desc";

export function parseCustomerListParams(sp: Record<string, string | string[] | undefined>) {
  return {
    search: typeof sp.q === "string" ? sp.q : undefined,
    type: pickOption(sp.type, ["pf", "pj"] as const),
    since: sinceFromParam(sp.periodo),
    sort: pickOption(sp.sort, CUSTOMER_SORT_OPTIONS) as CustomerSort | undefined,
  };
}
export type CustomerListOptions = ReturnType<typeof parseCustomerListParams>;
