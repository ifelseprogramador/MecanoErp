import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatedBanner } from "@/components/created-banner";
import { formatCents } from "@/core/money";
import { getWorkOrderById, listWorkOrderItems } from "@/modules/ordens/queries";
import {
  addWorkOrderItem,
  removeWorkOrderItem,
  transitionWorkOrderStatus,
  updateWorkOrderHeader,
} from "@/modules/ordens/actions";
import { WorkOrderForm } from "@/modules/ordens/components/work-order-form";
import { WorkOrderItemsEditor } from "@/modules/ordens/components/work-order-items-editor";
import { WorkOrderStatusActions } from "@/modules/ordens/components/work-order-status-actions";
import { WorkOrderStatusBadge } from "@/modules/ordens/components/work-order-status-badge";
import { isTerminalStatus } from "@/modules/ordens/domain";
import { listCustomersForSelect } from "@/modules/clientes";
import { listVehiclesForSelect } from "@/modules/veiculos";
import { listCatalogItemsForSelect } from "@/modules/catalogo";

export default async function WorkOrderDetailPage({
  params,
  searchParams,
}: PageProps<"/ordens/[id]">) {
  const { id } = await params;
  const { criado } = await searchParams;
  const [order, items, customers, vehicles, catalogItems] = await Promise.all([
    getWorkOrderById(id),
    listWorkOrderItems(id),
    listCustomersForSelect(),
    listVehiclesForSelect(),
    listCatalogItemsForSelect(),
  ]);

  if (!order) {
    notFound();
  }

  // A OS só pode ser editada (cabeçalho e itens) enquanto ainda é
  // orçamento ou já foi aprovada mas não terminou — depois de concluída
  // ou cancelada, o histórico fica congelado.
  const editable = order.status === "orcamento" || order.status === "aprovada";
  const itemsEditable = editable || order.status === "em_andamento";
  const updateHeaderWithId = updateWorkOrderHeader.bind(null, order.id);
  const addItemWithId = addWorkOrderItem.bind(null, order.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {criado === "1" && (
        <CreatedBanner
          message="Ordem de serviço criada com sucesso."
          createAnotherHref="/ordens/novo"
          createAnotherLabel="Criar outra"
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">OS #{order.number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <WorkOrderStatusBadge status={order.status} />
            <span className="text-muted-foreground text-sm">
              {order.customerName} — {order.vehiclePlate}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/ordens/${order.id}/imprimir`} target="_blank" />}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <WorkOrderStatusActions
            orderId={order.id}
            status={order.status}
            transitionAction={transitionWorkOrderStatus}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da ordem de serviço</CardTitle>
        </CardHeader>
        <CardContent>
          {editable ? (
            <WorkOrderForm
              order={order}
              customers={customers}
              vehicles={vehicles}
              action={updateHeaderWithId}
            />
          ) : (
            <ReadOnlyHeader
              relatoCliente={order.relatoCliente}
              diagnostico={order.diagnostico}
              kmEntrada={order.kmEntrada}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <WorkOrderItemsEditor
            orderId={order.id}
            items={items}
            catalogItems={catalogItems}
            addAction={addItemWithId}
            removeAction={removeWorkOrderItem}
            disabled={!itemsEditable}
          />
          <div className="flex flex-col gap-1 border-t pt-4 text-sm">
            {order.discountCents > 0 && (
              <div className="text-muted-foreground flex justify-between">
                <span>Desconto</span>
                <span>-{formatCents(order.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCents(order.totalCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isTerminalStatus(order.status) && (
        <p className="text-muted-foreground text-center text-sm">
          {order.status === "cancelada"
            ? "Esta ordem de serviço foi cancelada."
            : "Esta ordem de serviço já foi entregue."}
        </p>
      )}
    </div>
  );
}

function ReadOnlyHeader({
  relatoCliente,
  diagnostico,
  kmEntrada,
}: {
  relatoCliente: string | null;
  diagnostico: string | null;
  kmEntrada: number | null;
}) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      <div>
        <dt className="text-muted-foreground">Km de entrada</dt>
        <dd>{kmEntrada ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Relato do cliente</dt>
        <dd>{relatoCliente || "—"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Diagnóstico</dt>
        <dd>{diagnostico || "—"}</dd>
      </div>
    </dl>
  );
}
