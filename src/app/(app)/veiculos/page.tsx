import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { listVehicles } from "@/modules/veiculos/queries";
import { VehicleTable } from "@/modules/veiculos/components/vehicle-table";
import { PendingVehicles } from "@/modules/veiculos/components/pending-vehicles";

export default async function VehiclesPage({ searchParams }: PageProps<"/veiculos">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const vehicles = await listVehicles(search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Veículos</h1>
        <Button nativeButton={false} render={<Link href="/veiculos/novo" />}>
          <Plus className="h-4 w-4" />
          Novo veículo
        </Button>
      </div>

      <SearchBox placeholder="Buscar por placa..." />
      <PendingVehicles />
      <VehicleTable vehicles={vehicles} />
    </div>
  );
}
