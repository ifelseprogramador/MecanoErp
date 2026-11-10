"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { requireModule } from "@/core/auth";
import type { Database } from "@/core/db";
import type { ActionResult } from "@/core/action-result";
import { recordStatusChange } from "@/core/status-history";
import {
  areItemsEditable,
  calculateOrderTotal,
  isHeaderEditable,
  isValidTransition,
  type WorkOrderStatus,
} from "./domain";
import { workOrderCounters, workOrderItems, workOrders } from "./schema";
import {
  parseWorkOrderHeaderFormData,
  parseWorkOrderItemFormData,
  parseWorkOrderItemsPayload,
  type WorkOrderHeaderInput,
  type WorkOrderItemInput,
} from "./validation";

interface InsertResult extends ActionResult {
  id?: string;
}

const CONFLICT_MESSAGE =
  "Esta ordem de serviço foi alterada por outra pessoa enquanto você editava. Atualize a página e tente de novo.";

/**
 * Trava a linha da OS (`SELECT ... FOR UPDATE`) até o fim da transação e
 * devolve o estado atual. TODA mutação da OS (cabeçalho, item, status)
 * começa por aqui: duas pessoas mexendo na mesma OS se enfileiram em vez de
 * se atropelar — a segunda lê o estado já gravado pela primeira (cada
 * instrução em READ COMMITTED enxerga o que foi confirmado), então o total
 * recalculado nunca perde um item adicionado ao mesmo tempo.
 */
async function lockOrder(tx: Database, orderId: string, organizationId: string) {
  const [order] = await tx
    .select({
      id: workOrders.id,
      status: workOrders.status,
      discountCents: workOrders.discountCents,
      headerVersion: workOrders.headerVersion,
    })
    .from(workOrders)
    .where(and(eq(workOrders.id, orderId), eq(workOrders.organizationId, organizationId)))
    .limit(1)
    .for("update");
  return order ?? null;
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
  items: WorkOrderItemInput[] = [],
): Promise<InsertResult> {
  const { withDb, organizationId, userId, log } = await requireModule("ordens");
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

    await recordStatusChange(tx, {
      organizationId,
      userId,
      entityTable: "work_orders",
      entityId: order.id,
      fromStatus: null,
      toStatus: "orcamento",
    });

    // Itens do assistente do modo Fácil: entram na MESMA transação da OS (ou
    // a OS inteira existe, ou nada) e o total é recalculado no servidor.
    if (items.length > 0) {
      await tx.insert(workOrderItems).values(
        items.map((item) => ({
          workOrderId: order.id,
          type: item.type,
          description: item.description,
          quantity: String(item.quantity),
          unitPriceCents: item.unitPriceCents,
        })),
      );
      await recalculateOrderTotal(tx, order.id, data.discountCents);
    }

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
  // `requireModule("ordens")` aqui de propósito, antes até de validar o form — mesmo
  // motivo documentado em modules/clientes/actions.ts#createCustomer.
  const { log } = await requireModule("ordens");
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

/**
 * Novo orçamento do modo Fácil: cabeçalho + itens de uma vez (campo
 * `itemsJson`). Mesmas regras de `createWorkOrder`; o que muda é só levar os
 * itens junto na criação, para não obrigar a pessoa a abrir a OS depois.
 */
export async function createWorkOrderWithItems(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { log } = await requireModule("ordens");
  const parsed = parseWorkOrderHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const items = parseWorkOrderItemsPayload(formData.get("itemsJson"));
  if (!items.success) {
    return { ok: false, errors: { itemsJson: [items.error] } };
  }

  const result = await createWorkOrderRecord(parsed.data, undefined, items.data);
  redirect(`/ordens/${result.id}?criado=1`);
}

export async function updateWorkOrderHeader(
  orderId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { withDb, organizationId, log } = await requireModule("ordens");
  log.info("ordens.atualizar", { orderId });

  const parsed = parseWorkOrderHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.atualizar.validacao_falhou", {
      orderId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  // Versão do cabeçalho que a pessoa estava vendo (campo oculto do
  // formulário). Sem ela não dá para detectar edição simultânea.
  const rawVersion = formData.get("headerVersion");
  const expectedVersion =
    rawVersion === null || rawVersion === "" ? Number.NaN : Number(rawVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return { ok: false, message: "Não foi possível salvar. Atualize a página e tente de novo." };
  }

  const outcome = await withDb(async (tx) => {
    const order = await lockOrder(tx, orderId, organizationId);
    if (!order) return "not_found" as const;
    if (!isHeaderEditable(order.status)) return "locked" as const;
    if (order.headerVersion !== expectedVersion) return "conflict" as const;

    await tx
      .update(workOrders)
      .set({
        ...parsed.data,
        headerVersion: sql`${workOrders.headerVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, orderId));

    await recalculateOrderTotal(tx, orderId, parsed.data.discountCents);
    return "ok" as const;
  });

  if (outcome === "not_found") {
    log.warn("ordens.atualizar.nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }
  if (outcome === "locked") {
    log.warn("ordens.atualizar.nao_editavel", { orderId });
    return {
      ok: false,
      message: "Esta ordem de serviço não pode mais ser editada (status mudou). Atualize a página.",
    };
  }
  if (outcome === "conflict") {
    log.warn("ordens.atualizar.conflito", { orderId });
    return { ok: false, message: CONFLICT_MESSAGE };
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
  const { withDb, organizationId, log } = await requireModule("ordens");
  log.info("ordens.item.adicionar", { orderId });

  const parsed = parseWorkOrderItemFormData(formData);
  if (!parsed.success) {
    log.warn("ordens.item.adicionar.validacao_falhou", {
      orderId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const outcome = await withDb(async (tx) => {
    const order = await lockOrder(tx, orderId, organizationId);
    if (!order) return "not_found" as const;
    if (!areItemsEditable(order.status)) return "locked" as const;

    await tx.insert(workOrderItems).values({
      workOrderId: orderId,
      type: parsed.data.type,
      description: parsed.data.description,
      quantity: String(parsed.data.quantity),
      unitPriceCents: parsed.data.unitPriceCents,
    });

    await recalculateOrderTotal(tx, orderId, order.discountCents);
    return "ok" as const;
  });

  if (outcome === "not_found") {
    log.warn("ordens.item.adicionar.ordem_nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }
  if (outcome === "locked") {
    log.warn("ordens.item.adicionar.nao_editavel", { orderId });
    return {
      ok: false,
      message: "Esta ordem de serviço não aceita mais itens (status mudou). Atualize a página.",
    };
  }

  log.info("ordens.item.adicionar.sucesso", { orderId });
  revalidatePath(`/ordens/${orderId}`);
  return { ok: true };
}

export async function removeWorkOrderItem(itemId: string, orderId: string): Promise<ActionResult> {
  const { withDb, organizationId, log } = await requireModule("ordens");
  log.info("ordens.item.remover", { itemId, orderId });

  const outcome = await withDb(async (tx) => {
    const order = await lockOrder(tx, orderId, organizationId);
    if (!order) return "not_found" as const;
    if (!areItemsEditable(order.status)) return "locked" as const;

    await tx
      .delete(workOrderItems)
      .where(and(eq(workOrderItems.id, itemId), eq(workOrderItems.workOrderId, orderId)));

    await recalculateOrderTotal(tx, orderId, order.discountCents);
    return "ok" as const;
  });

  if (outcome === "not_found") {
    log.warn("ordens.item.remover.ordem_nao_encontrada", { orderId });
    return { ok: false, message: "Ordem de serviço não encontrada." };
  }
  if (outcome === "locked") {
    log.warn("ordens.item.remover.nao_editavel", { orderId });
    return {
      ok: false,
      message:
        "Esta ordem de serviço não aceita mais alterações de itens (status mudou). Atualize a página.",
    };
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
  const { withDb, organizationId, userId, log } = await requireModule("ordens");
  const actionName = STATUS_ACTION_LABEL[nextStatus] ?? "ordens.transicao";
  log.info(actionName, { orderId, nextStatus });

  const outcome = await withDb(async (tx) => {
    // Linha travada: se outra pessoa está mudando o status (ou mexendo em
    // item) desta mesma OS, esperamos ela terminar e validamos a transição
    // contra o status que ficou — nunca contra um status já velho.
    const order = await lockOrder(tx, orderId, organizationId);
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

    await recordStatusChange(tx, {
      organizationId,
      userId,
      entityTable: "work_orders",
      entityId: orderId,
      fromStatus: order.status,
      toStatus: nextStatus,
    });

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
