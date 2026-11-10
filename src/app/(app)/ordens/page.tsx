import Link from "next/link";
import { ClipboardList, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIcon } from "@/components/page-icon";
import { SearchBox } from "@/components/search-box";
import { ListFilterBar } from "@/components/list-filter-bar";
import { listWorkOrders } from "@/modules/ordens/queries";
import {
  WORK_ORDER_DEFAULT_SORT,
  WORK_ORDER_FILTERS,
  WORK_ORDER_SORT_CHOICES,
  parseWorkOrderListParams,
} from "@/modules/ordens/list-config";
import { WorkOrderTable } from "@/modules/ordens/components/work-order-table";
import { PendingWorkOrders } from "@/modules/ordens/components/pending-work-orders";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { OrdensFacilHome } from "@/modules/ordens/components/ordens-facil";

export default async function WorkOrdersPage({ searchParams }: PageProps<"/ordens">) {
  const sp = await searchParams;
  const options = parseWorkOrderListParams(sp);
  if ((await getCurrentUiMode()) === "facil") {
    return <OrdensFacilHome options={options} showAll={sp.ver === "todos"} />;
  }

  const orders = await listWorkOrders(options);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <PageIcon icon={ClipboardList} />
          <h1 className="text-2xl font-semibold tracking-tight">Ordens de serviço</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/ordens/exportar" />}
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button nativeButton={false} render={<Link href="/ordens/novo" />}>
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Buscar por cliente, placa ou nº..." />
        <ListFilterBar
          filters={WORK_ORDER_FILTERS}
          sortOptions={WORK_ORDER_SORT_CHOICES}
          defaultSort={WORK_ORDER_DEFAULT_SORT}
        />
      </div>
      <PendingWorkOrders />
      <WorkOrderTable orders={orders} />
    </div>
  );
}
