import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { customers } from "@/modules/clientes/schema";
import { vehicles } from "@/modules/veiculos/schema";
import { workOrderItems, workOrders, workOrderStatusEnum } from "./schema";

export const WORK_ORDER_SORT_OPTIONS = {
  number_desc: "Nº (mais recente primeiro)",
  number_asc: "Nº (mais antigo primeiro)",
  total_desc: "Total (maior primeiro)",
  total_asc: "Total (menor primeiro)",
} as const;
export type WorkOrderSort = keyof typeof WORK_ORDER_SORT_OPTIONS;

const WORK_ORDER_ORDER_BY = {
  number_desc: desc(workOrders.number),
  number_asc: asc(workOrders.number),
  total_desc: desc(workOrders.totalCents),
  total_asc: asc(workOrders.totalCents),
} as const;

export type WorkOrderStatusFilter = (typeof workOrderStatusEnum.enumValues)[number];

export async function listWorkOrders(options?: {
  search?: string;
  status?: WorkOrderStatusFilter;
  sort?: WorkOrderSort;
}) {
  const { db, organizationId } = await withOrg();

  const term = options?.search?.trim();
  const conditions = [eq(workOrders.organizationId, organizationId)];
  if (term) {
    const numberTerm = Number(term);
    conditions.push(
      or(
        ilike(customers.name, `%${term}%`),
        ilike(vehicles.plate, `%${term.toUpperCase().replace(/[^A-Z0-9]/g, "")}%`),
        Number.isInteger(numberTerm) ? eq(workOrders.number, numberTerm) : sql`false`,
      )!,
    );
  }
  if (options?.status) {
    conditions.push(eq(workOrders.status, options.status));
  }

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
    .where(and(...conditions))
    .orderBy(WORK_ORDER_ORDER_BY[options?.sort ?? "number_desc"]);
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
