import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { customers } from "@/modules/clientes/schema";
import { vehicles } from "@/modules/veiculos/schema";
import { workOrderItems, workOrders } from "./schema";

export async function listWorkOrders() {
  const { db, organizationId } = await withOrg();

  return db
    .select({
      id: workOrders.id,
      number: workOrders.number,
      status: workOrders.status,
      totalCents: workOrders.totalCents,
      createdAt: workOrders.createdAt,
      customerName: customers.name,
      vehiclePlate: vehicles.plate,
    })
    .from(workOrders)
    .innerJoin(customers, eq(customers.id, workOrders.customerId))
    .innerJoin(vehicles, eq(vehicles.id, workOrders.vehicleId))
    .where(eq(workOrders.organizationId, organizationId))
    .orderBy(desc(workOrders.number));
}

export async function getWorkOrderById(id: string) {
  const { db, organizationId } = await withOrg();

  const [order] = await db
    .select({
      id: workOrders.id,
      organizationId: workOrders.organizationId,
      number: workOrders.number,
      customerId: workOrders.customerId,
      vehicleId: workOrders.vehicleId,
      status: workOrders.status,
      kmEntrada: workOrders.kmEntrada,
      relatoCliente: workOrders.relatoCliente,
      diagnostico: workOrders.diagnostico,
      discountCents: workOrders.discountCents,
      totalCents: workOrders.totalCents,
      approvedAt: workOrders.approvedAt,
      startedAt: workOrders.startedAt,
      completedAt: workOrders.completedAt,
      deliveredAt: workOrders.deliveredAt,
      cancelledAt: workOrders.cancelledAt,
      createdAt: workOrders.createdAt,
      updatedAt: workOrders.updatedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      vehiclePlate: vehicles.plate,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
    })
    .from(workOrders)
    .innerJoin(customers, eq(customers.id, workOrders.customerId))
    .innerJoin(vehicles, eq(vehicles.id, workOrders.vehicleId))
    .where(and(eq(workOrders.id, id), eq(workOrders.organizationId, organizationId)))
    .limit(1);

  return order ?? null;
}

export async function listWorkOrderItems(workOrderId: string) {
  const { db, organizationId } = await withOrg();

  // `work_order_items` não tem `organization_id` próprio — o join com
  // `work_orders` garante o isolamento por tenant mesmo se este método
  // for chamado direto (sem passar primeiro por `getWorkOrderById`, que
  // já filtra por org).
  return db
    .select({
      id: workOrderItems.id,
      workOrderId: workOrderItems.workOrderId,
      type: workOrderItems.type,
      description: workOrderItems.description,
      quantity: workOrderItems.quantity,
      unitPriceCents: workOrderItems.unitPriceCents,
      totalCents: workOrderItems.totalCents,
      createdAt: workOrderItems.createdAt,
    })
    .from(workOrderItems)
    .innerJoin(workOrders, eq(workOrders.id, workOrderItems.workOrderId))
    .where(
      and(
        eq(workOrderItems.workOrderId, workOrderId),
        eq(workOrders.organizationId, organizationId),
      ),
    )
    .orderBy(asc(workOrderItems.createdAt));
}
