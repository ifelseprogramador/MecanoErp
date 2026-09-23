import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CreatedBanner } from "@/components/created-banner";
import { formatPlate } from "@/core/format";
import { getVehicleById } from "@/modules/veiculos/queries";
import { deleteVehicle, updateVehicle } from "@/modules/veiculos/actions";
import { VehicleForm } from "@/modules/veiculos/components/vehicle-form";
import { listCustomersForSelect } from "@/modules/clientes";

export default async function VehicleDetailPage({
  params,
  searchParams,
}: PageProps<"/veiculos/[id]">) {
  const { id } = await params;
  const { criado } = await searchParams;
  const [vehicle, customers] = await Promise.all([getVehicleById(id), listCustomersForSelect()]);

  if (!vehicle) {
    notFound();
  }

  const updateVehicleWithId = updateVehicle.bind(null, vehicle.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      {criado === "1" && (
        <CreatedBanner
          message="Veículo cadastrado com sucesso."
          createAnotherHref={`/veiculos/novo?customerId=${vehicle.customerId}`}
          createAnotherLabel="Cadastrar outro"
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{formatPlate(vehicle.plate)}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/veiculos/${vehicle.id}/imprimir`} target="_blank" />}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <ConfirmDeleteButton
            title="Remover veículo"
            description="Essa ação não pode ser desfeita. O veículo só pode ser removido se não tiver ordens de serviço vinculadas."
            onConfirm={deleteVehicle.bind(null, vehicle.id)}
            redirectTo="/veiculos"
          />
        </div>
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
