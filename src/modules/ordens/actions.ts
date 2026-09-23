"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { calculateOrderTotal, isValidTransition, type WorkOrderStatus } from "./domain";
import { workOrderCounters, workOrderItems, workOrders } from "./schema";
import { parseWorkOrderHeaderFormData, parseWorkOrderItemFormData } from "./validation";

/** Recalcula e grava o total da OS a partir dos itens atuais + desconto —
 * chamado depois de toda mutação de item ou de desconto, nunca calculado
 * só no cliente (o total gravado é sempre a fonte da verdade). */
async function recalculateOrderTotal(
  db: Awaited<ReturnType<typeof withOrg>>["db"],
  workOrderId: string,
  discountCents: number,
) {
  const items = await db
    .select({ quantity: workOrderItems.quantity, unitPriceCents: workOrderItems.unitPriceCents })
    .from(workOrderItems)
    .where(eq(workOrderItems.workOrderId, workOrderId));

  const totalCents = calculateOrderTotal(
    items.map((item) => ({ quantity: Number(item.quantity), unitPriceCents: item.unitPriceCents })),
    discountCents,
  );

  await db
    .update(workOrders)
    .set({ totalCents, updatedAt: new Date() })
    .where(eq(workOrders.id, workOrderId));
  return totalCents;
}

export async function createWorkOrder(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("ordens.criar");

  const parsed = parseWorkOrderHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  // Upsert atômico: uma única instrução, sem corrida entre duas OSs
  // criadas ao mesmo tempo na mesma oficina (ver comentário em
  // schema.ts#workOrderCounters).
  const [{ lastNumber }] = await db
    .insert(workOrderCounters)
    .values({ organizationId, lastNumber: 1 })
    .onConflictDoUpdate({
      target: workOrderCounters.organizationId,
      set: { lastNumber: sql`${workOrderCounters.lastNumber} + 1` },
    })
    .returning({ lastNumber: workOrderCounters.lastNumber });

  const [order] = await db
    .insert(workOrders)
    .values({ ...parsed.data, organizationId, number: lastNumber })
    .returning({ id: workOrders.id });
  log.info("ordens.criar.sucesso", { orderId: order.id, number: lastNumber });

  revalidatePath("/ordens");
  redirect(`/ordens/${order.id}`);
}

export async function updateWorkOrderHeader(
  orderId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("ordens.atualizar", { orderId });

  const parsed = parseWorkOrderHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.atualizar.validacao_falhou", {
      orderId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await db
    .update(workOrders)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
    .returning({ id: workOrders.id });

  if (result.length === 0) {
    log.warn("ordens.atualizar.nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }

  await recalculateOrderTotal(db, orderId, parsed.data.discountCents);
  log.info("ordens.atualizar.sucesso", { orderId });
  revalidatePath(`/ordens/${orderId}`);
  return { ok: true };
}

export async function addWorkOrderItem(
  orderId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("ordens.item.adicionar", { orderId });

  const parsed = parseWorkOrderItemFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.item.adicionar.validacao_falhou", {
      orderId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const [order] = await db
    .select({ id: workOrders.id, discountCents: workOrders.discountCents })
    .from(workOrders)
    .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
    .limit(1);
  if (!order) {
    log.warn("ordens.item.adicionar.ordem_nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }

  await db.insert(workOrderItems).values({
    workOrderId: orderId,
    type: parsed.data.type,
    description: parsed.data.description,
    quantity: String(parsed.data.quantity),
    unitPriceCents: parsed.data.unitPriceCents,
  });

  await recalculateOrderTotal(db, orderId, order.discountCents);
  log.info("ordens.item.adicionar.sucesso", { orderId });
  revalidatePath(`/ordens/${orderId}`);
  return { ok: true };
}

export async function removeWorkOrderItem(itemId: string, orderId: string): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("ordens.item.remover", { itemId, orderId });

  const [order] = await db
    .select({ id: workOrders.id, discountCents: workOrders.discountCents })
    .from(workOrders)
    .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
    .limit(1);
  if (!order) {
    log.warn("ordens.item.remover.ordem_nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }

  await db
    .delete(workOrderItems)
    .where(and(eq(workOrderItems.id, itemId), eq(workOrderItems.workOrderId, orderId)));

  await recalculateOrderTotal(db, orderId, order.discountCents);
  log.info("ordens.item.remover.sucesso", { itemId, orderId });
  revalidatePath(`/ordens/${orderId}`);
  return { ok: true };
}

const STATUS_ACTION_LABEL: Record<string, string> = {
  aprovada: "ordens.aprovar",
  em_andamento: "ordens.iniciar",
  concluida: "ordens.concluir",
  entregue: "ordens.entregar",
  cancelada: "ordens.cancelar",
};

const STATUS_TIMESTAMP_FIELD: Partial<
  Record<
    WorkOrderStatus,
    "approvedAt" | "startedAt" | "completedAt" | "deliveredAt" | "cancelledAt"
  >
> = {
  aprovada: "approvedAt",
  em_andamento: "startedAt",
  concluida: "completedAt",
  entregue: "deliveredAt",
  cancelada: "cancelledAt",
};

export async function transitionWorkOrderStatus(
  orderId: string,
  nextStatus: WorkOrderStatus,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  const actionName = STATUS_ACTION_LABEL[nextStatus] ?? "ordens.transicao";
  log.info(actionName, { orderId, nextStatus });

  const [order] = await db
    .select({ id: workOrders.id, status: workOrders.status })
    .from(workOrders)
    .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
    .limit(1);
  if (!order) {
    log.warn(`${actionName}.nao_encontrada`, { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }

  if (!isValidTransition(order.status, nextStatus)) {
    log.warn(`${actionName}.transicao_invalida`, { orderId, de: order.status, para: nextStatus });
    return {
      ok: false,
      message: `Não é possível mudar de "${order.status}" para "${nextStatus}".`,
    };
  }

  const timestampField = STATUS_TIMESTAMP_FIELD[nextStatus];
  await db
    .update(workOrders)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
      ...(timestampField && { [timestampField]: new Date() }),
    })
    .where(eq(workOrders.id, orderId));

  log.info(`${actionName}.sucesso`, { orderId });
  revalidatePath(`/ordens/${orderId}`);
  revalidatePath("/ordens");
  return { ok: true };
}
