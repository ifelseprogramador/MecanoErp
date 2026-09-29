"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { Database } from "@/core/db";
import type { ActionResult } from "@/core/action-result";
import { calculateOrderTotal, isValidTransition, type WorkOrderStatus } from "./domain";
import { workOrderCounters, workOrderItems, workOrders } from "./schema";
import {
  parseWorkOrderHeaderFormData,
  parseWorkOrderItemFormData,
  type WorkOrderHeaderInput,
} from "./validation";

interface InsertResult extends ActionResult {
  id?: string;
}

/** Recalcula e grava o total da OS a partir dos itens atuais + desconto —
 * chamado depois de toda mutação de item ou de desconto, nunca calculado
 * só no cliente (o total gravado é sempre a fonte da verdade). */
async function recalculateOrderTotal(tx: Database, workOrderId: string, discountCents: number) {
  const items = await tx
    .select({ quantity: workOrderItems.quantity, unitPriceCents: workOrderItems.unitPriceCents })
    .from(workOrderItems)
    .where(eq(workOrderItems.workOrderId, workOrderId));

  const totalCents = calculateOrderTotal(
    items.map((item) => ({ quantity: Number(item.quantity), unitPriceCents: item.unitPriceCents })),
    discountCents,
  );

  await tx
    .update(workOrders)
    .set({ totalCents, updatedAt: new Date() })
    .where(eq(workOrders.id, workOrderId));
  return totalCents;
}

/**
 * Faz o INSERT em si, sem `redirect()` — mesmo padrão de
 * `modules/clientes/actions.ts#createCustomerRecord`: chamável direto
 * pelo motor de sincronização offline (`core/offline/replay-handlers.ts`).
 *
 * O número sequencial (`workOrderCounters`) só é obtido AQUI, no momento
 * do insert de verdade — nunca calculado/mostrado no cliente enquanto a
 * OS está só na fila offline. É o que evita qualquer colisão de
 * numeração: mesmo que várias OSs tenham sido criadas offline na mesma
 * sessão, o motor de sync as reprocessa sequencialmente (nunca em
 * paralelo — ver `sync-engine.ts`), e cada uma só pega seu número real
 * quando chega a vez dela sincronizar de verdade, pelo mesmo upsert
 * atômico de sempre. Enquanto pendente, a ficha "provisória" simplesmente
 * não mostra número nenhum (ver `(app)/ordens/pendente/page.tsx`).
 */
export async function createWorkOrderRecord(
  data: WorkOrderHeaderInput,
  id?: string,
): Promise<InsertResult> {
  const { withDb, organizationId, log } = await withOrg();
  log.info("ordens.criar", { offline: Boolean(id) });

  // Upsert atômico: uma única instrução, sem corrida entre duas OSs
  // criadas ao mesmo tempo na mesma oficina (ver comentário em
  // schema.ts#workOrderCounters).
  const { order, lastNumber } = await withDb(async (tx) => {
    const [{ lastNumber }] = await tx
      .insert(workOrderCounters)
      .values({ organizationId, lastNumber: 1 })
      .onConflictDoUpdate({
        target: workOrderCounters.organizationId,
        set: { lastNumber: sql`${workOrderCounters.lastNumber} + 1` },
      })
      .returning({ lastNumber: workOrderCounters.lastNumber });

    const [order] = await tx
      .insert(workOrders)
      .values({ ...data, organizationId, number: lastNumber, ...(id && { id }) })
      .returning({ id: workOrders.id });

    return { order, lastNumber };
  });
  log.info("ordens.criar.sucesso", { orderId: order.id, number: lastNumber });

  revalidatePath("/ordens");
  return { ok: true, id: order.id };
}

export async function createWorkOrder(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // `withOrg()` aqui de propósito, antes até de validar o form — mesmo
  // motivo documentado em modules/clientes/actions.ts#createCustomer.
  const { log } = await withOrg();
  const parsed = parseWorkOrderHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createWorkOrderRecord(parsed.data);

  // `redirect()` fica fora do try/catch pelo mesmo motivo documentado em
  // modules/clientes/actions.ts#createCustomer.
  redirect(`/ordens/${result.id}?criado=1`);
}

export async function updateWorkOrderHeader(
  orderId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { withDb, organizationId, log } = await withOrg();
  log.info("ordens.atualizar", { orderId });

  const parsed = parseWorkOrderHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.atualizar.validacao_falhou", {
      orderId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const notFound = await withDb(async (tx) => {
    const result = await tx
      .update(workOrders)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
      .returning({ id: workOrders.id });

    if (result.length === 0) return true;

    await recalculateOrderTotal(tx, orderId, parsed.data.discountCents);
    return false;
  });

  if (notFound) {
    log.warn("ordens.atualizar.nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }

  log.info("ordens.atualizar.sucesso", { orderId });
  revalidatePath(`/ordens/${orderId}`);
  return { ok: true };
}

export async function addWorkOrderItem(
  orderId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { withDb, organizationId, log } = await withOrg();
  log.info("ordens.item.adicionar", { orderId });

  const parsed = parseWorkOrderItemFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.item.adicionar.validacao_falhou", {
      orderId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const orderFound = await withDb(async (tx) => {
    const [order] = await tx
      .select({ id: workOrders.id, discountCents: workOrders.discountCents })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
      .limit(1);
    if (!order) return false;

    await tx.insert(workOrderItems).values({
      workOrderId: orderId,
      type: parsed.data.type,
      description: parsed.data.description,
      quantity: String(parsed.data.quantity),
      unitPriceCents: parsed.data.unitPriceCents,
    });

    await recalculateOrderTotal(tx, orderId, order.discountCents);
    return true;
  });

  if (!orderFound) {
    log.warn("ordens.item.adicionar.ordem_nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }

  log.info("ordens.item.adicionar.sucesso", { orderId });
  revalidatePath(`/ordens/${orderId}`);
  return { ok: true };
}

export async function removeWorkOrderItem(itemId: string, orderId: string): Promise<ActionResult> {
  const { withDb, organizationId, log } = await withOrg();
  log.info("ordens.item.remover", { itemId, orderId });

  const orderFound = await withDb(async (tx) => {
    const [order] = await tx
      .select({ id: workOrders.id, discountCents: workOrders.discountCents })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
      .limit(1);
    if (!order) return false;

    await tx
      .delete(workOrderItems)
      .where(and(eq(workOrderItems.id, itemId), eq(workOrderItems.workOrderId, orderId)));

    await recalculateOrderTotal(tx, orderId, order.discountCents);
    return true;
  });

  if (!orderFound) {
    log.warn("ordens.item.remover.ordem_nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }

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
  const { withDb, organizationId, log } = await withOrg();
  const actionName = STATUS_ACTION_LABEL[nextStatus] ?? "ordens.transicao";
  log.info(actionName, { orderId, nextStatus });

  const outcome = await withDb(async (tx) => {
    const [order] = await tx
      .select({ id: workOrders.id, status: workOrders.status })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
      .limit(1);
    if (!order) return { kind: "not_found" as const };

    if (!isValidTransition(order.status, nextStatus)) {
      return { kind: "invalid_transition" as const, from: order.status };
    }

    const timestampField = STATUS_TIMESTAMP_FIELD[nextStatus];
    await tx
      .update(workOrders)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
        ...(timestampField && { [timestampField]: new Date() }),
      })
      .where(eq(workOrders.id, orderId));

    return { kind: "ok" as const };
  });

  if (outcome.kind === "not_found") {
    log.warn(`${actionName}.nao_encontrada`, { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }

  if (outcome.kind === "invalid_transition") {
    log.warn(`${actionName}.transicao_invalida`, {
      orderId,
      de: outcome.from,
      para: nextStatus,
    });
    return {
      ok: false,
      message: `Não é possível mudar de "${outcome.from}" para "${nextStatus}".`,
    };
  }

  log.info(`${actionName}.sucesso`, { orderId });
  revalidatePath(`/ordens/${orderId}`);
  revalidatePath("/ordens");
  return { ok: true };
}
