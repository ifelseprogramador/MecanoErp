import "server-only";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { customers } from "./schema";

export const CUSTOMER_SORT_OPTIONS = {
  created_desc: "Mais recentes primeiro",
  created_asc: "Mais antigos primeiro",
  name_asc: "Nome (A→Z)",
  name_desc: "Nome (Z→A)",
} as const;
export type CustomerSort = keyof typeof CUSTOMER_SORT_OPTIONS;

const CUSTOMER_ORDER_BY = {
  created_desc: desc(customers.createdAt),
  created_asc: asc(customers.createdAt),
  name_asc: asc(customers.name),
  name_desc: desc(customers.name),
} as const;

export async function listCustomers(options?: {
  search?: string;
  type?: "pf" | "pj";
  sort?: CustomerSort;
}) {
  const { db, organizationId } = await withOrg();

  const term = options?.search?.trim();
  const conditions = [eq(customers.organizationId, organizationId)];
  if (term) {
    conditions.push(
      or(ilike(customers.name, `%${term}%`), ilike(customers.document, `%${term}%`))!,
    );
  }
  if (options?.type) {
    conditions.push(eq(customers.type, options.type));
  }

  return db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(CUSTOMER_ORDER_BY[options?.sort ?? "created_desc"]);
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
