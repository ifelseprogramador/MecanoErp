"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { catalogItems } from "./schema";
import { parseCatalogItemFormData, type CatalogItemInput } from "./validation";

interface InsertResult extends ActionResult {
  id?: string;
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23503";
}

/**
 * Faz o INSERT em si, sem `redirect()` — mesmo padrão de
 * `modules/clientes/actions.ts#createCustomerRecord`: chamável direto
 * pelo motor de sincronização offline (`core/offline/replay-handlers.ts`).
 */
export async function createCatalogItemRecord(
  data: CatalogItemInput,
  id?: string,
): Promise<InsertResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("catalogo.criar", { offline: Boolean(id) });

  const [item] = await db
    .insert(catalogItems)
    .values({ ...data, organizationId, ...(id && { id }) })
    .returning({ id: catalogItems.id });
  log.info("catalogo.criar.sucesso", { itemId: item.id });

  revalidatePath("/catalogo");
  return { ok: true, id: item.id };
}

export async function createCatalogItem(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // `withOrg()` aqui de propósito, antes até de validar o form — mesmo
  // motivo documentado em modules/clientes/actions.ts#createCustomer.
  const { log } = await withOrg();
  const parsed = parseCatalogItemFormData(formData);
  if (!parsed.success) {
    log.warn("catalogo.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createCatalogItemRecord(parsed.data);

  // `redirect()` fica fora do try/catch pelo mesmo motivo documentado em
  // modules/clientes/actions.ts#createCustomer.
  redirect(`/catalogo/${result.id}`);
}

export async function updateCatalogItem(
  itemId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("catalogo.atualizar", { itemId });

  const parsed = parseCatalogItemFormData(formData);
  if (!parsed.success) {
    log.warn("catalogo.atualizar.validacao_falhou", {
      itemId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await db
    .update(catalogItems)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(catalogItems.id, itemId), eq(catalogItems.organizationId, organizationId)))
    .returning({ id: catalogItems.id });

  if (result.length === 0) {
    log.warn("catalogo.atualizar.nao_encontrado", { itemId });
    return { ok: false, message: "Item não encontrado." };
  }

  log.info("catalogo.atualizar.sucesso", { itemId });
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${itemId}`);
  return { ok: true };
}

export async function deleteCatalogItem(itemId: string): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("catalogo.remover", { itemId });

  try {
    const result = await db
      .delete(catalogItems)
      .where(and(eq(catalogItems.id, itemId), eq(catalogItems.organizationId, organizationId)))
      .returning({ id: catalogItems.id });

    if (result.length === 0) {
      log.warn("catalogo.remover.nao_encontrado", { itemId });
      return { ok: false, message: "Item não encontrado." };
    }

    log.info("catalogo.remover.sucesso", { itemId });
    revalidatePath("/catalogo");
    return { ok: true };
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      log.warn("catalogo.remover.bloqueado_por_vinculo", { itemId });
      return {
        ok: false,
        message: "Este item está usado em alguma ordem de serviço e não pode ser removido.",
      };
    }
    log.error("catalogo.remover.falhou", { itemId, err });
    return { ok: false, message: "Não foi possível remover o item. Tente novamente." };
  }
}
