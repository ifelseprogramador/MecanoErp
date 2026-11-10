import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { NewVehicleForm } from "@/modules/veiculos/components/new-vehicle-form";
import { listCustomersForSelect } from "@/modules/clientes";
import { getCustomerById } from "@/modules/clientes/queries";
import { quickCreateCustomer, searchCustomersForPick } from "@/modules/clientes/pick-actions";
import { NewVehicleFacil } from "@/modules/veiculos/components/new-vehicle-facil";
import { FacilPage } from "@/components/facil/facil-page";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { Car } from "lucide-react";

export default async function NewVehiclePage({ searchParams }: PageProps<"/veiculos/novo">) {
  const { customerId } = await searchParams;

  // Modo Fácil primeiro: busca no servidor, sem carregar todos os clientes.
  if ((await getCurrentUiMode()) === "facil") {
    const preset = typeof customerId === "string" ? await getCustomerById(customerId) : null;
    return (
      <FacilPage title="Novo veículo" icon={Car} backHref="/veiculos" backLabel="Veículos">
        <NewVehicleFacil
          searchCustomers={searchCustomersForPick}
          createCustomer={quickCreateCustomer}
          defaultCustomer={
            preset
              ? { value: preset.id, label: preset.name, subtitle: preset.phone ?? undefined }
              : undefined
          }
        />
      </FacilPage>
    );
  }

  const customers = await listCustomersForSelect();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-2xl font-semibold tracking-tight">Novo veículo</h1>
      </div>
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
