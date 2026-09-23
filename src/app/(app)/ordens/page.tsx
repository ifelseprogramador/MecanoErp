import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listWorkOrders } from "@/modules/ordens/queries";
import { WorkOrderTable } from "@/modules/ordens/components/work-order-table";

export default async function WorkOrdersPage() {
  const orders = await listWorkOrders();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ordens de serviço</h1>
        <Button nativeButton={false} render={<Link href="/ordens/novo" />}>
          <Plus className="h-4 w-4" />
          Novo orçamento
        </Button>
      </div>

      <WorkOrderTable orders={orders} />
    </div>
  );
}
