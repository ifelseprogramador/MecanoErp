import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { NewWorkOrderForm } from "@/modules/ordens/components/new-work-order-form";
import { listCustomersForSelect } from "@/modules/clientes";
import { listVehiclesForSelect } from "@/modules/veiculos";
import { quickCreateCustomer, searchCustomersForPick } from "@/modules/clientes/pick-actions";
import { quickCreateVehicle, searchVehiclesForPick } from "@/modules/veiculos/pick-actions";
import { quickCreateCatalogItem, searchCatalogForPick } from "@/modules/catalogo/pick-actions";
import { NewWorkOrderFacil } from "@/modules/ordens/components/new-work-order-facil";
import { FacilPage } from "@/components/facil/facil-page";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { ClipboardList } from "lucide-react";

export default async function NewWorkOrderPage() {
  // Modo Fácil primeiro: ele busca no servidor enquanto a pessoa digita, então
  // nem carrega a lista inteira de clientes e veículos (que pode ser enorme).
  if ((await getCurrentUiMode()) === "facil") {
    return (
      <FacilPage
        title="Novo orçamento"
        icon={ClipboardList}
        backHref="/ordens"
        backLabel="Ordens de serviço"
      >
        <NewWorkOrderFacil
          pickers={{
            searchCustomers: searchCustomersForPick,
            createCustomer: quickCreateCustomer,
            searchVehicles: searchVehiclesForPick,
            createVehicle: quickCreateVehicle,
            searchCatalog: searchCatalogForPick,
            createCatalogItem: quickCreateCatalogItem,
          }}
        />
      </FacilPage>
    );
  }

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
