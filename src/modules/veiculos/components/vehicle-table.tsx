import { EditLink } from "@/components/edit-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPlate } from "@/core/format";
import { RowActions } from "@/components/row-actions";
import { deleteVehicle } from "../actions";

interface VehicleRow {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  customerName: string;
}

export function VehicleTable({ vehicles }: { vehicles: VehicleRow[] }) {
  if (vehicles.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">Nenhum veículo encontrado.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Placa</TableHead>
          <TableHead>Veículo</TableHead>
          <TableHead>Ano</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map((vehicle) => (
          <TableRow key={vehicle.id}>
            <TableCell>
              <EditLink href={`/veiculos/${vehicle.id}`} className="font-medium">
                {formatPlate(vehicle.plate)}
              </EditLink>
            </TableCell>
            <TableCell>{[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "—"}</TableCell>
            <TableCell>{vehicle.year ?? "—"}</TableCell>
            <TableCell>{vehicle.customerName}</TableCell>
            <TableCell>
              <RowActions
                editHref={`/veiculos/${vehicle.id}`}
                deleteTitle="Remover veículo"
                deleteDescription="Essa ação não pode ser desfeita. O veículo só pode ser removido se não tiver ordens de serviço vinculadas."
                onDelete={deleteVehicle.bind(null, vehicle.id)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
