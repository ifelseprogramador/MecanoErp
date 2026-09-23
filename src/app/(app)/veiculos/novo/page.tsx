import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewVehicleForm } from "@/modules/veiculos/components/new-vehicle-form";
import { listCustomersForSelect } from "@/modules/clientes";

export default async function NewVehiclePage({ searchParams }: PageProps<"/veiculos/novo">) {
  const { customerId } = await searchParams;
  const customers = await listCustomersForSelect();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo veículo</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados do veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <NewVehicleForm
            customers={customers}
            defaultCustomerId={typeof customerId === "string" ? customerId : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
