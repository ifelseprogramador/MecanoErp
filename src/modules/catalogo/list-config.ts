import type { FilterField } from "@/components/list-filter-bar";
import { PERIOD_FILTER, pickOption, sinceFromParam } from "@/core/list-filters";
import { CATALOG_SORT_OPTIONS, type CatalogSort } from "./queries";

/** Filtros e ordenação da lista do catálogo — UMA definição para os dois layouts. */
export const CATALOG_FILTERS: FilterField[] = [
  {
    param: "type",
    allLabel: "Peças e serviços",
    options: [
      { value: "servico", label: "Serviços" },
      { value: "peca", label: "Peças" },
    ],
  },
  { ...PERIOD_FILTER, allLabel: "Qualquer data de cadastro" },
];
export const CATALOG_SORT_CHOICES = Object.entries(CATALOG_SORT_OPTIONS).map(([value, label]) => ({
  value,
  label,
}));
export const CATALOG_DEFAULT_SORT: CatalogSort = "name_asc";

export function parseCatalogListParams(sp: Record<string, string | string[] | undefined>) {
  return {
    search: typeof sp.q === "string" ? sp.q : undefined,
    type: pickOption(sp.type, ["servico", "peca"] as const),
    since: sinceFromParam(sp.periodo),
    sort: pickOption(sp.sort, CATALOG_SORT_OPTIONS) as CatalogSort | undefined,
  };
}
export type CatalogListOptions = ReturnType<typeof parseCatalogListParams>;
