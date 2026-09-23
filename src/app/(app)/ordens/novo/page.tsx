import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewWorkOrderForm } from "@/modules/ordens/components/new-work-order-form";
import { listCustomersForSelect } from "@/modules/clientes";
import { listVehiclesForSelect } from "@/modules/veiculos";

export default async function NewWorkOrderPage() {
  const [customers, vehicles] = await Promise.all([
    listCustomersForSelect(),
    listVehiclesForSelect(),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo orçamento</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados da ordem de serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <NewWorkOrderForm customers={customers} vehicles={vehicles} />
        </CardContent>
      </Card>
    </div>
  );
}
