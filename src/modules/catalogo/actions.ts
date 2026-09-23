"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { catalogItems } from "./schema";
import { parseCatalogItemFormData } from "./validation";

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23503";
}

export async function createCatalogItem(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("catalogo.criar");

  const parsed = parseCatalogItemFormData(formData);
  if (!parsed.success) {
    log.warn("catalogo.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const [item] = await db
    .insert(catalogItems)
    .values({ ...parsed.data, organizationId })
    .returning({ id: catalogItems.id });
  log.info("catalogo.criar.sucesso", { itemId: item.id });

  revalidatePath("/catalogo");
  redirect(`/catalogo/${item.id}`);
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
