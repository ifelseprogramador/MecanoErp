import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { ListFilterBar } from "@/components/list-filter-bar";
import {
  WORK_ORDER_SORT_OPTIONS,
  type WorkOrderSort,
  type WorkOrderStatusFilter,
  listWorkOrders,
} from "@/modules/ordens/queries";
import { WORK_ORDER_STATUS_LABELS } from "@/modules/ordens/components/work-order-status-badge";
import { WorkOrderTable } from "@/modules/ordens/components/work-order-table";
import { PendingWorkOrders } from "@/modules/ordens/components/pending-work-orders";

export default async function WorkOrdersPage({ searchParams }: PageProps<"/ordens">) {
  const { q, status, sort } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const statusFilter =
    typeof status === "string" && status in WORK_ORDER_STATUS_LABELS
      ? (status as WorkOrderStatusFilter)
      : undefined;
  const orderSort =
    typeof sort === "string" && sort in WORK_ORDER_SORT_OPTIONS
      ? (sort as WorkOrderSort)
      : undefined;
  const orders = await listWorkOrders({ search, status: statusFilter, sort: orderSort });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Ordens de serviço</h1>
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
          filters={[
            {
              param: "status",
              allLabel: "Todos os status",
              options: Object.entries(WORK_ORDER_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            },
          ]}
          sortOptions={Object.entries(WORK_ORDER_SORT_OPTIONS).map(([value, label]) => ({
            value,
            label,
          }))}
          defaultSort="number_desc"
        />
      </div>
      <PendingWorkOrders />
      <WorkOrderTable orders={orders} />
    </div>
  );
}
