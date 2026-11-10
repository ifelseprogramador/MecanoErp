import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIcon } from "@/components/page-icon";
import { SearchBox } from "@/components/search-box";
import { ListFilterBar } from "@/components/list-filter-bar";
import { listCatalogItems } from "@/modules/catalogo/queries";
import {
  CATALOG_DEFAULT_SORT,
  CATALOG_FILTERS,
  CATALOG_SORT_CHOICES,
  parseCatalogListParams,
} from "@/modules/catalogo/list-config";
import { CatalogItemTable } from "@/modules/catalogo/components/catalog-item-table";
import { PendingCatalogItems } from "@/modules/catalogo/components/pending-catalog-items";
import { ImportExportButtons } from "@/components/import-export-buttons";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { CatalogoFacilHome } from "@/modules/catalogo/components/catalogo-facil";

export default async function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  const sp = await searchParams;
  const options = parseCatalogListParams(sp);
  if ((await getCurrentUiMode()) === "facil") {
    return <CatalogoFacilHome options={options} showAll={sp.ver === "todos"} />;
  }

  const items = await listCatalogItems(options);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <PageIcon icon={Package} />
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
        </div>
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
          filters={CATALOG_FILTERS}
          sortOptions={CATALOG_SORT_CHOICES}
          defaultSort={CATALOG_DEFAULT_SORT}
        />
      </div>
      <PendingCatalogItems />
      <CatalogItemTable items={items} />
    </div>
  );
}
