import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatPlate } from "@/core/format";
import { getVehicleById } from "@/modules/veiculos/queries";
import { deleteVehicle, updateVehicle } from "@/modules/veiculos/actions";
import { VehicleForm } from "@/modules/veiculos/components/vehicle-form";
import { listCustomersForSelect } from "@/modules/clientes";

export default async function VehicleDetailPage({ params }: PageProps<"/veiculos/[id]">) {
  const { id } = await params;
  const [vehicle, customers] = await Promise.all([getVehicleById(id), listCustomersForSelect()]);

  if (!vehicle) {
    notFound();
  }

  const updateVehicleWithId = updateVehicle.bind(null, vehicle.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{formatPlate(vehicle.plate)}</h1>
        <ConfirmDeleteButton
          title="Remover veículo"
          description="Essa ação não pode ser desfeita. O veículo só pode ser removido se não tiver ordens de serviço vinculadas."
          onConfirm={deleteVehicle.bind(null, vehicle.id)}
          redirectTo="/veiculos"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm vehicle={vehicle} customers={customers} action={updateVehicleWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
