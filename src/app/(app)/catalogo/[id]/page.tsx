import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CreatedBanner } from "@/components/created-banner";
import { getCatalogItemById } from "@/modules/catalogo/queries";
import { deleteCatalogItem, updateCatalogItem } from "@/modules/catalogo/actions";
import { CatalogItemForm } from "@/modules/catalogo/components/catalog-item-form";

export default async function CatalogItemDetailPage({
  params,
  searchParams,
}: PageProps<"/catalogo/[id]">) {
  const { id } = await params;
  const { criado } = await searchParams;
  const item = await getCatalogItemById(id);

  if (!item) {
    notFound();
  }

  const updateItemWithId = updateCatalogItem.bind(null, item.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      {criado === "1" && (
        <CreatedBanner
          message="Item cadastrado com sucesso."
          createAnotherHref="/catalogo/novo"
          createAnotherLabel="Cadastrar outro"
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/catalogo/${item.id}/imprimir`} target="_blank" />}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <ConfirmDeleteButton
            title="Remover item"
            description="Essa ação não pode ser desfeita. O item só pode ser removido se não estiver usado em nenhuma ordem de serviço."
            onConfirm={deleteCatalogItem.bind(null, item.id)}
            redirectTo="/catalogo"
          />
        </div>
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
