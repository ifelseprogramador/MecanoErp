import Link from "next/link";
import { Car, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIcon } from "@/components/page-icon";
import { SearchBox } from "@/components/search-box";
import { ListFilterBar } from "@/components/list-filter-bar";
import { listVehicleYears, listVehicles } from "@/modules/veiculos/queries";
import {
  VEHICLE_DEFAULT_SORT,
  VEHICLE_SORT_CHOICES,
  parseVehicleListParams,
  vehicleFilters,
} from "@/modules/veiculos/list-config";
import { VehicleTable } from "@/modules/veiculos/components/vehicle-table";
import { PendingVehicles } from "@/modules/veiculos/components/pending-vehicles";
import { ImportExportButtons } from "@/components/import-export-buttons";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { VeiculosFacilHome } from "@/modules/veiculos/components/veiculos-facil";

export default async function VehiclesPage({ searchParams }: PageProps<"/veiculos">) {
  const sp = await searchParams;
  const options = parseVehicleListParams(sp);
  if ((await getCurrentUiMode()) === "facil") {
    return <VeiculosFacilHome options={options} showAll={sp.ver === "todos"} />;
  }

  const [vehicles, years] = await Promise.all([listVehicles(options), listVehicleYears()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <PageIcon icon={Car} />
          <h1 className="text-2xl font-semibold tracking-tight">Veículos</h1>
        </div>
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
          filters={vehicleFilters(years)}
          sortOptions={VEHICLE_SORT_CHOICES}
          defaultSort={VEHICLE_DEFAULT_SORT}
        />
      </div>
      <PendingVehicles />
      <VehicleTable vehicles={vehicles} />
    </div>
  );
}
