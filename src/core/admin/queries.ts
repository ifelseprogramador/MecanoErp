import "server-only";
import { desc, eq, ilike, sql } from "drizzle-orm";
import { requireAdmin } from "@/core/admin-auth";
import { getAuditLogForOrg } from "@/core/admin/audit";
import { getUserDisplayInfoByIds } from "@/core/user-lookup";
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

  const [members, [{ count: customerCount }], [{ count: vehicleCount }], moduleSettings, audit] =
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
      getAuditLogForOrg(organizationId),
    ]);

  const userIds = [...members.map((m) => m.userId), ...audit.map((a) => a.actorUserId)];
  const displayInfoById = await getUserDisplayInfoByIds(db, userIds);

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
}
