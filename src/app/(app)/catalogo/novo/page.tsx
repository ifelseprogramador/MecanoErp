import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { NewCatalogItemForm } from "@/modules/catalogo/components/new-catalog-item-form";
import { NewCatalogItemFacil } from "@/modules/catalogo/components/new-catalog-item-facil";
import { FacilPage } from "@/components/facil/facil-page";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { Package } from "lucide-react";

export default async function NewCatalogItemPage() {
  if ((await getCurrentUiMode()) === "facil") {
    return (
      <FacilPage title="Novo item" icon={Package} backHref="/catalogo" backLabel="Catálogo">
        <NewCatalogItemFacil />
      </FacilPage>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-2xl font-semibold tracking-tight">Novo item</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do item</CardTitle>
        </CardHeader>
        <CardContent>
          <NewCatalogItemForm />
        </CardContent>
      </Card>
    </div>
  );
}
