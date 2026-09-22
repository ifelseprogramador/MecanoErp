import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { customers } from "./schema";

export async function listCustomers(search?: string) {
  const { db, organizationId } = await withOrg();

  const term = search?.trim();
  const conditions = [eq(customers.organizationId, organizationId)];
  if (term) {
    conditions.push(
      or(ilike(customers.name, `%${term}%`), ilike(customers.document, `%${term}%`))!,
    );
  }

  return db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.createdAt));
}

/** Lista enxuta para popular seletores (ex.: escolher o cliente de um veículo). */
export async function listCustomersForSelect() {
  const { db, organizationId } = await withOrg();

  return db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .orderBy(customers.name);
}

export async function getCustomerById(id: string) {
  const { db, organizationId } = await withOrg();

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)))
    .limit(1);

  return customer ?? null;
}
