import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
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
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-2xl font-semibold tracking-tight">Novo orçamento</h1>
      </div>
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
