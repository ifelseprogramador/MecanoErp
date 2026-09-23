import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogItemForm } from "@/modules/catalogo/components/catalog-item-form";
import { createCatalogItem } from "@/modules/catalogo/actions";

export default function NewCatalogItemPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo item</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados do item</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogItemForm action={createCatalogItem} />
        </CardContent>
      </Card>
    </div>
  );
}
