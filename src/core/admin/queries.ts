import "server-only";
import type { Database } from "@/core/db";
import { desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "@/core/admin-auth";
import { getAuditLogForOrg } from "@/core/admin/audit";
import { getUserDisplayInfoByIds } from "@/core/user-lookup";
import {
  customers,
  loginEvents,
  memberships,
  organizationModuleSettings,
  organizations,
  vehicles,
} from "@/db/schema";

export async function listOrganizationsForAdmin(search?: string) {
  const { withDb } = await requireAdmin();

  const term = search?.trim();

  return withDb((tx) => {
    const query = tx
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
  });
}

export async function getOrganizationForAdmin(organizationId: string) {
  const { withDb } = await requireAdmin();

  return withDb(async (tx) => {
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org) return null;

    const [members, [{ count: customerCount }], [{ count: vehicleCount }], moduleSettings, audit] =
      await Promise.all([
        tx
          .select({
            id: memberships.id,
            userId: memberships.userId,
            role: memberships.role,
            active: memberships.active,
          })
          .from(memberships)
          .where(eq(memberships.organizationId, organizationId)),
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(customers)
          .where(eq(customers.organizationId, organizationId)),
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(vehicles)
          .where(eq(vehicles.organizationId, organizationId)),
        tx
          .select()
          .from(organizationModuleSettings)
          .where(eq(organizationModuleSettings.organizationId, organizationId)),
        getAuditLogForOrg(tx, organizationId),
      ]);

    const userIds = [...members.map((m) => m.userId), ...audit.map((a) => a.actorUserId)];
    const displayInfoById = await getUserDisplayInfoByIds(tx, userIds);

    return {
      organization: org,
      members: members.map((m) => {
        const info = displayInfoById.get(m.userId);
        return { ...m, email: info?.email ?? null, name: info?.name ?? m.userId };
      }),
      customerCount,
      vehicleCount,
      moduleSettings,
      audit: audit.map((a) => ({
        ...a,
        actorName: displayInfoById.get(a.actorUserId)?.name ?? a.actorUserId,
      })),
    };
  });
}

/**
 * Últimos acessos (logins), do mais recente ao mais antigo. Com `organizationId`,
 * só de quem é membro dessa organização (o histórico guarda a pessoa, não a
 * organização: quem saiu da equipe deixa de aparecer na ficha dela).
 */
export async function listLoginEvents(options: { organizationId?: string; limit?: number } = {}) {
  const { withDb } = await requireAdmin();
  const { organizationId, limit = 200 } = options;
  return withDb((tx) =>
    tx
      .select()
      .from(loginEvents)
      .where(
        organizationId ? inArray(loginEvents.userId, membersOf(tx, organizationId)) : undefined,
      )
      .orderBy(desc(loginEvents.createdAt))
      .limit(limit),
  );
}

/** Subconsulta: ids das pessoas que são membros da organização. */
export function membersOf(db: Pick<Database, "select">, organizationId: string) {
  return db
    .select({ id: memberships.userId })
    .from(memberships)
    .where(eq(memberships.organizationId, organizationId));
}
