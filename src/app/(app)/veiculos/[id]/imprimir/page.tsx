import { notFound } from "next/navigation";
import { formatDate, formatPlate } from "@/core/format";
import { getVehicleById } from "@/modules/veiculos/queries";
import { getActiveOrg } from "@/core/auth";
import { AutoPrint } from "@/components/auto-print";

const FUEL_LABELS: Record<string, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  flex: "Flex",
  diesel: "Diesel",
  eletrico: "Elétrico",
  gnv: "GNV",
};

/** Impressão da ficha do veículo — mesmo padrão de
 * `(app)/ordens/[id]/imprimir/page.tsx` (ver comentário lá). */
export default async function PrintVehiclePage({ params }: PageProps<"/veiculos/[id]/imprimir">) {
  const { id } = await params;
  const [vehicle, org] = await Promise.all([getVehicleById(id), getActiveOrg()]);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 text-sm">
      <AutoPrint />
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">{org.organizationName}</h1>
          <p className="text-muted-foreground">Ficha de veículo</p>
        </div>
        <p className="text-muted-foreground">Emitida em {formatDate(new Date())}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{formatPlate(vehicle.plate)}</h2>
        <p className="text-muted-foreground">Cliente: {vehicle.customerName}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Marca" value={vehicle.brand || "—"} />
        <Field label="Modelo" value={vehicle.model || "—"} />
        <Field label="Ano" value={vehicle.year?.toString() || "—"} />
        <Field label="Cor" value={vehicle.color || "—"} />
        <Field label="Combustível" value={vehicle.fuel ? FUEL_LABELS[vehicle.fuel] : "—"} />
        <Field label="Quilometragem atual" value={vehicle.currentKm?.toString() || "—"} />
        <Field label="Chassi" value={vehicle.chassis || "—"} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
