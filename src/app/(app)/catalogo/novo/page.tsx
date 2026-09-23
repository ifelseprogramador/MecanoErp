import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { NewCatalogItemForm } from "@/modules/catalogo/components/new-catalog-item-form";

export default function NewCatalogItemPage() {
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
