import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkOrderForm } from "@/modules/ordens/components/work-order-form";
import { createWorkOrder } from "@/modules/ordens/actions";
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
          <WorkOrderForm customers={customers} vehicles={vehicles} action={createWorkOrder} />
        </CardContent>
      </Card>
    </div>
  );
}
