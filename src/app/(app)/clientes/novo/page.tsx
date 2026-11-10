import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { NewCustomerForm } from "@/modules/clientes/components/new-customer-form";
import { NewCustomerFacil } from "@/modules/clientes/components/new-customer-facil";
import { FacilPage } from "@/components/facil/facil-page";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { UserPlus } from "lucide-react";

export default async function NewCustomerPage() {
  if ((await getCurrentUiMode()) === "facil") {
    return (
      <FacilPage title="Novo cliente" icon={UserPlus} backHref="/clientes" backLabel="Clientes">
        <NewCustomerFacil />
      </FacilPage>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <NewCustomerForm />
        </CardContent>
      </Card>
    </div>
  );
}
