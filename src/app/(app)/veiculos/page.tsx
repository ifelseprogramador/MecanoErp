import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { ListFilterBar } from "@/components/list-filter-bar";
import {
  VEHICLE_SORT_OPTIONS,
  type VehicleSort,
  listVehicleYears,
  listVehicles,
} from "@/modules/veiculos/queries";
import { VehicleTable } from "@/modules/veiculos/components/vehicle-table";
import { PendingVehicles } from "@/modules/veiculos/components/pending-vehicles";
import { ImportExportButtons } from "@/components/import-export-buttons";

export default async function VehiclesPage({ searchParams }: PageProps<"/veiculos">) {
  const { q, year, sort } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const vehicleYear = typeof year === "string" && /^\d+$/.test(year) ? Number(year) : undefined;
  const vehicleSort =
    typeof sort === "string" && sort in VEHICLE_SORT_OPTIONS ? (sort as VehicleSort) : undefined;
  const [vehicles, years] = await Promise.all([
    listVehicles({ search, year: vehicleYear, sort: vehicleSort }),
    listVehicleYears(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Veículos</h1>
        <div className="flex items-center gap-2">
          <ImportExportButtons basePath="/veiculos" />
          <Button nativeButton={false} render={<Link href="/veiculos/novo" />}>
            <Plus className="h-4 w-4" />
            Novo veículo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Buscar por placa..." />
        <ListFilterBar
          filters={[
            {
              param: "year",
              allLabel: "Todos os anos",
              options: years.map((y) => ({ value: String(y), label: String(y) })),
            },
          ]}
          sortOptions={Object.entries(VEHICLE_SORT_OPTIONS).map(([value, label]) => ({
            value,
            label,
          }))}
          defaultSort="created_desc"
        />
      </div>
      <PendingVehicles />
      <VehicleTable vehicles={vehicles} />
    </div>
  );
}
