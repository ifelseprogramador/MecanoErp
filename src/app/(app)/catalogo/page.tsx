import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { listCatalogItems } from "@/modules/catalogo/queries";
import { CatalogItemTable } from "@/modules/catalogo/components/catalog-item-table";

export default async function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const items = await listCatalogItems(search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
        <Button nativeButton={false} render={<Link href="/catalogo/novo" />}>
          <Plus className="h-4 w-4" />
          Novo item
        </Button>
      </div>

      <SearchBox placeholder="Buscar por nome..." />
      <CatalogItemTable items={items} />
    </div>
  );
}
