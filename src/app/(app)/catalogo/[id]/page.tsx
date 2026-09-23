import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { getCatalogItemById } from "@/modules/catalogo/queries";
import { deleteCatalogItem, updateCatalogItem } from "@/modules/catalogo/actions";
import { CatalogItemForm } from "@/modules/catalogo/components/catalog-item-form";

export default async function CatalogItemDetailPage({ params }: PageProps<"/catalogo/[id]">) {
  const { id } = await params;
  const item = await getCatalogItemById(id);

  if (!item) {
    notFound();
  }

  const updateItemWithId = updateCatalogItem.bind(null, item.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
        <ConfirmDeleteButton
          title="Remover item"
          description="Essa ação não pode ser desfeita. O item só pode ser removido se não estiver usado em nenhuma ordem de serviço."
          onConfirm={deleteCatalogItem.bind(null, item.id)}
          redirectTo="/catalogo"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do item</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogItemForm item={item} action={updateItemWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
