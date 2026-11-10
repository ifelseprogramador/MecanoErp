import type { FilterField } from "@/components/list-filter-bar";
import { PERIOD_FILTER, pickOption, sinceFromParam } from "@/core/list-filters";
import { VEHICLE_SORT_OPTIONS, type VehicleSort } from "./queries";

/** Filtros e ordenação da lista de veículos — UMA definição para os dois layouts. */
export function vehicleFilters(years: number[]): FilterField[] {
  return [
    {
      param: "year",
      allLabel: "Todos os anos",
      options: years.map((y) => ({ value: String(y), label: String(y) })),
    },
    { ...PERIOD_FILTER, allLabel: "Qualquer data de cadastro" },
  ];
}
export const VEHICLE_SORT_CHOICES = Object.entries(VEHICLE_SORT_OPTIONS).map(([value, label]) => ({
  value,
  label,
}));
export const VEHICLE_DEFAULT_SORT: VehicleSort = "created_desc";

export function parseVehicleListParams(sp: Record<string, string | string[] | undefined>) {
  return {
    search: typeof sp.q === "string" ? sp.q : undefined,
    year: typeof sp.year === "string" && /^\d+$/.test(sp.year) ? Number(sp.year) : undefined,
    since: sinceFromParam(sp.periodo),
    sort: pickOption(sp.sort, VEHICLE_SORT_OPTIONS) as VehicleSort | undefined,
  };
}
export type VehicleListOptions = ReturnType<typeof parseVehicleListParams>;
