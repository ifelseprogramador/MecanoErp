import { FileDown, FileUp, List, Package, Plus, Wrench } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { FacilFilters } from "@/components/facil/facil-filters";
import { hasActiveFilter } from "@/core/list-filters";
import { FacilKpi } from "@/components/facil/facil-kpi";
import { FacilModuleHome } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilTile } from "@/components/facil/facil-tile";
import { formatCents } from "@/core/money";
import { listCatalogItems } from "../queries";
import { PendingCatalogItems } from "./pending-catalog-items";
import {
  CATALOG_DEFAULT_SORT,
  CATALOG_FILTERS,
  CATALOG_SORT_CHOICES,
  type CatalogListOptions,
} from "../list-config";

const INITIAL_LIMIT = 12;

/**
 * Janela inicial do Catálogo no modo Fácil: contagem de serviços e peças,
 * cards de ação, busca grande e os itens em cards. O catálogo é pequeno, então
 * a busca filtra a lista já carregada (uma consulta só, e as métricas contam
 * o catálogo inteiro, não só o resultado da busca).
 */
export async function CatalogoFacilHome({
  options,
  showAll,
}: {
  options: CatalogListOptions;
  showAll: boolean;
}) {
  const filtered = hasActiveFilter(options);
  // As métricas contam o catálogo inteiro, não só o resultado do filtro.
  const [items, all] = await Promise.all([listCatalogItems(options), listCatalogItems()]);
  const everything = showAll || filtered;
  const servicos = all.filter((item) => item.type === "servico").length;

  return (
    <FacilModuleHome
      title="Catálogo"
      subtitle="Serviços e peças que você vende"
      icon={Package}
      kpis={
        <>
          <FacilKpi icon={Wrench} label="Serviços" value={servicos} index={0} />
          <FacilKpi icon={Package} label="Peças" value={all.length - servicos} index={1} />
        </>
      }
      actions={
        <>
          <FacilTile href="/catalogo/novo" label="Novo item" icon={Plus} size="lg" index={0} />
          {!everything && (
            <FacilTile
              href="/catalogo?ver=todos"
              label="Ver todos"
              icon={List}
              size="lg"
              index={1}
            />
          )}
          <FacilTile
            href="/catalogo/importar"
            label="Importar planilha"
            icon={FileUp}
            size="lg"
            index={2}
          />
          <FacilTile
            href="/catalogo/exportar"
            label="Baixar planilha"
            icon={FileDown}
            size="lg"
            index={3}
            download
          />
        </>
      }
    >
      <SearchBox large placeholder="Buscar serviço ou peça pelo nome" />
      <FacilFilters
        filters={CATALOG_FILTERS}
        sortOptions={CATALOG_SORT_CHOICES}
        defaultSort={CATALOG_DEFAULT_SORT}
      />
      <PendingCatalogItems />
      <FacilList
        items={items.map((item) => ({
          id: item.id,
          href: `/catalogo/${item.id}`,
          title: item.name,
          subtitle: `${formatCents(item.defaultPriceCents)} por ${item.unit}`,
          badge: item.type === "servico" ? "Serviço" : "Peça",
          icon: item.type === "servico" ? Wrench : Package,
        }))}
        limit={everything ? Number.POSITIVE_INFINITY : INITIAL_LIMIT}
        moreHref="/catalogo?ver=todos"
        emptyTitle={filtered ? "Nenhum item encontrado" : "O catálogo está vazio"}
        emptyHint={
          filtered ? "Tente outro filtro ou limpe a busca." : "Cadastre o primeiro serviço ou peça."
        }
        emptyAction={
          filtered ? undefined : (
            <FacilTile href="/catalogo/novo" label="Novo item" icon={Plus} size="lg" />
          )
        }
      />
    </FacilModuleHome>
  );
}
