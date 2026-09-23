import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { ListFilterBar } from "@/components/list-filter-bar";
import {
  CATALOG_SORT_OPTIONS,
  type CatalogSort,
  listCatalogItems,
} from "@/modules/catalogo/queries";
import { CatalogItemTable } from "@/modules/catalogo/components/catalog-item-table";
import { PendingCatalogItems } from "@/modules/catalogo/components/pending-catalog-items";
import { ImportExportButtons } from "@/components/import-export-buttons";

export default async function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  const { q, type, sort } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const itemType = type === "servico" || type === "peca" ? type : undefined;
  const itemSort =
    typeof sort === "string" && sort in CATALOG_SORT_OPTIONS ? (sort as CatalogSort) : undefined;
  const items = await listCatalogItems({ search, type: itemType, sort: itemSort });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
        <div className="flex items-center gap-2">
          <ImportExportButtons basePath="/catalogo" />
          <Button nativeButton={false} render={<Link href="/catalogo/novo" />}>
            <Plus className="h-4 w-4" />
            Novo item
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Buscar por nome..." />
        <ListFilterBar
          filters={[
            {
              param: "type",
              allLabel: "Todos os tipos",
              options: [
                { value: "servico", label: "Serviço" },
                { value: "peca", label: "Peça" },
              ],
            },
          ]}
          sortOptions={Object.entries(CATALOG_SORT_OPTIONS).map(([value, label]) => ({
            value,
            label,
          }))}
          defaultSort="name_asc"
        />
      </div>
      <PendingCatalogItems />
      <CatalogItemTable items={items} />
    </div>
  );
}
