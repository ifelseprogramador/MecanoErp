import "server-only";
import { and, asc, eq, ilike } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { catalogItems } from "./schema";

export async function listCatalogItems(search?: string) {
  const { db, organizationId } = await withOrg();

  const term = search?.trim();
  const conditions = [eq(catalogItems.organizationId, organizationId)];
  if (term) {
    conditions.push(ilike(catalogItems.name, `%${term}%`));
  }

  return db
    .select()
    .from(catalogItems)
    .where(and(...conditions))
    .orderBy(asc(catalogItems.name));
}

/** Lista enxuta pro editor de itens da OS (select/autocomplete) — sem
 * paginação, assumindo o catálogo de uma oficina pequena/média. */
export async function listCatalogItemsForSelect() {
  const { db, organizationId } = await withOrg();

  return db
    .select({
      id: catalogItems.id,
      type: catalogItems.type,
      name: catalogItems.name,
      unit: catalogItems.unit,
      defaultPriceCents: catalogItems.defaultPriceCents,
    })
    .from(catalogItems)
    .where(eq(catalogItems.organizationId, organizationId))
    .orderBy(asc(catalogItems.name));
}

export async function getCatalogItemById(id: string) {
  const { db, organizationId } = await withOrg();

  const [item] = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.id, id), eq(catalogItems.organizationId, organizationId)))
    .limit(1);

  return item ?? null;
}

/** Autocomplete de itens no editor da OS — nome + até 20 resultados. */
export async function searchCatalogItems(search: string) {
  const { db, organizationId } = await withOrg();

  const term = search.trim();
  if (!term) return [];

  return db
    .select()
    .from(catalogItems)
    .where(
      and(eq(catalogItems.organizationId, organizationId), ilike(catalogItems.name, `%${term}%`)),
    )
    .orderBy(asc(catalogItems.name))
    .limit(20);
}
