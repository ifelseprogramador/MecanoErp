import "server-only";
import { desc, eq, ilike, sql } from "drizzle-orm";
import { requireAdmin } from "@/core/admin-auth";
import {
  customers,
  memberships,
  organizationModuleSettings,
  organizations,
  vehicles,
} from "@/db/schema";

export async function listOrganizationsForAdmin(search?: string) {
  const { db } = await requireAdmin();

  const term = search?.trim();
  const query = db
    .select({
      id: organizations.id,
      name: organizations.name,
      status: organizations.status,
      billingStatus: organizations.billingStatus,
      nextDueDate: organizations.nextDueDate,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  return term ? query.where(ilike(organizations.name, `%${term}%`)) : query;
}

export async function getOrganizationForAdmin(organizationId: string) {
  const { db } = await requireAdmin();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!org) return null;

  const [members, [{ count: customerCount }], [{ count: vehicleCount }], moduleSettings] =
    await Promise.all([
      db
        .select({
          id: memberships.id,
          userId: memberships.userId,
          role: memberships.role,
          active: memberships.active,
        })
        .from(memberships)
        .where(eq(memberships.organizationId, organizationId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(eq(customers.organizationId, organizationId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(vehicles)
        .where(eq(vehicles.organizationId, organizationId)),
      db
        .select()
        .from(organizationModuleSettings)
        .where(eq(organizationModuleSettings.organizationId, organizationId)),
    ]);

  // auth.users não é modelado pelo Drizzle (schema gerenciado pelo Supabase
  // Auth) — lido com SQL bruto, na mesma conexão (que já enxerga o schema
  // auth por ser o papel `postgres`; ver docs/decisoes.md).
  const memberEmails =
    members.length > 0
      ? await db.execute<{ id: string; email: string | null }>(
          sql`select id, email from auth.users where id in (${sql.join(
            members.map((m) => sql`${m.userId}`),
            sql`, `,
          )})`,
        )
      : [];

  const emailById = new Map(Array.from(memberEmails).map((u) => [u.id, u.email]));

  return {
    organization: org,
    members: members.map((m) => ({ ...m, email: emailById.get(m.userId) ?? null })),
    customerCount,
    vehicleCount,
    moduleSettings,
  };
}
