import { Calendar, Car, Fuel, Gauge, Palette, Pencil, Printer, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CreatedBanner } from "@/components/created-banner";
import { HistoryCard } from "@/components/history-card";
import { FacilInfo } from "@/components/facil/facil-info";
import { FacilPage } from "@/components/facil/facil-page";
import { FacilActions, FacilTile } from "@/components/facil/facil-tile";
import { formatPlate } from "@/core/format";
import { deleteVehicle, updateVehicle } from "../actions";
import type { Vehicle } from "../schema.types";
import { VehicleForm } from "./vehicle-form";

const FUEL_LABELS: Record<string, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  flex: "Flex",
  diesel: "Diesel",
  eletrico: "Elétrico",
  gnv: "GNV",
};

/**
 * Ficha do veículo no modo Fácil: dados em linhas simples e cards de ação.
 * A edição completa reaproveita o `VehicleForm` formal atrás de "Editar
 * dados" (`?editar=1`). `customers` vem da página (composição entre módulos
 * só na camada de rotas).
 */
export function VehicleFacilDetail({
  vehicle,
  customers,
  created,
  editing,
}: {
  vehicle: Vehicle;
  customers: { id: string; name: string }[];
  created: boolean;
  editing: boolean;
}) {
  const owner = customers.find((customer) => customer.id === vehicle.customerId);

  return (
    <FacilPage
      title={formatPlate(vehicle.plate)}
      subtitle={[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || undefined}
      icon={Car}
      backHref="/veiculos"
      backLabel="Veículos"
    >
      {created && (
        <CreatedBanner
          message="Veículo cadastrado com sucesso."
          createAnotherHref={`/veiculos/novo?customerId=${vehicle.customerId}`}
          createAnotherLabel="Cadastrar outro"
        />
      )}

      <FacilInfo
        rows={[
          {
            icon: UserRound,
            label: "Cliente",
            value: owner?.name,
            href: owner ? `/clientes/${owner.id}` : undefined,
          },
          { icon: Calendar, label: "Ano", value: vehicle.year },
          { icon: Palette, label: "Cor", value: vehicle.color },
          {
            icon: Fuel,
            label: "Combustível",
            value: vehicle.fuel ? FUEL_LABELS[vehicle.fuel] : null,
          },
          {
            icon: Gauge,
            label: "Quilometragem",
            value: vehicle.currentKm !== null ? `${vehicle.currentKm} km` : null,
          },
        ]}
      />

      <FacilActions>
        <FacilTile
          href={editing ? `/veiculos/${vehicle.id}` : `/veiculos/${vehicle.id}?editar=1`}
          label={editing ? "Fechar edição" : "Editar dados"}
          icon={Pencil}
          size="lg"
          index={0}
        />
        <FacilTile
          href={`/veiculos/${vehicle.id}/imprimir`}
          label="Imprimir ficha"
          icon={Printer}
          size="lg"
          index={1}
        />
      </FacilActions>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Editar dados do veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <VehicleForm
              vehicle={vehicle}
              customers={customers}
              action={updateVehicle.bind(null, vehicle.id)}
            />
          </CardContent>
        </Card>
      )}

      <HistoryCard
        createdBy={vehicle.createdBy}
        createdAt={vehicle.createdAt}
        updatedBy={vehicle.updatedBy}
        updatedAt={vehicle.updatedAt}
      />

      <div className="flex justify-center pt-2">
        <ConfirmDeleteButton
          title="Remover veículo"
          description="Essa ação não pode ser desfeita. O veículo só pode ser removido se não tiver ordens de serviço vinculadas."
          onConfirm={deleteVehicle.bind(null, vehicle.id)}
          redirectTo="/veiculos"
        />
      </div>
    </FacilPage>
  );
}
