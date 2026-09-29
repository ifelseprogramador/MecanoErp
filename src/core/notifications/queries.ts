import "server-only";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { requireAdmin } from "@/core/admin-auth";
import { getUserDisplayInfoByIds } from "@/core/user-lookup";
import { notificationReads, notifications } from "@/db/schema/notifications";
import { organizations } from "@/db/schema/tenancy";

/**
 * Notificações visíveis pra organização de quem está logado — "pra
 * todos" (`organization_id` nulo) ou só a dela — com `read` já
 * calculado pra ESTA pessoa (`userId`), mais recente primeiro. As que
 * ela apagou do sino (`dismissedAt`) ficam de fora.
 */
export async function listNotificationsForCurrentUser() {
  const { withDb, organizationId, userId } = await withOrg();

  const rows = await withDb((tx) =>
    tx
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        category: notifications.category,
        createdAt: notifications.createdAt,
        readAt: notificationReads.readAt,
      })
      .from(notifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, notifications.id),
          eq(notificationReads.userId, userId),
        ),
      )
      .where(
        and(
          or(
            isNull(notifications.organizationId),
            eq(notifications.organizationId, organizationId),
          ),
          isNull(notificationReads.dismissedAt),
        ),
      )
      .orderBy(desc(notifications.createdAt)),
  );

  return rows;
}

export async function countUnreadForCurrentUser(): Promise<number> {
  const rows = await listNotificationsForCurrentUser();
  return rows.filter((r) => !r.readAt).length;
}

// --- lado do admin -----------------------------------------------------

export async function listNotificationsForAdmin() {
  const { withDb } = await requireAdmin();

  return withDb((tx) =>
    tx
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        category: notifications.category,
        organizationId: notifications.organizationId,
        organizationName: organizations.name,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
      })
      .from(notifications)
      .leftJoin(organizations, eq(organizations.id, notifications.organizationId))
      .orderBy(desc(notifications.createdAt)),
  );
}

export async function getNotificationForAdmin(notificationId: string) {
  const { withDb } = await requireAdmin();

  return withDb(async (tx) => {
    const [notification] = await tx
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        category: notifications.category,
        organizationId: notifications.organizationId,
        organizationName: organizations.name,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .leftJoin(organizations, eq(organizations.id, notifications.organizationId))
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notification) return null;

    const readerRows = await tx
      .select({
        userId: notificationReads.userId,
        organizationId: notificationReads.organizationId,
        organizationName: organizations.name,
        readAt: notificationReads.readAt,
      })
      .from(notificationReads)
      .innerJoin(organizations, eq(organizations.id, notificationReads.organizationId))
      .where(eq(notificationReads.notificationId, notificationId))
      .orderBy(desc(notificationReads.readAt));

    const displayInfoById = await getUserDisplayInfoByIds(
      tx,
      readerRows.map((r) => r.userId),
    );

    const readers = readerRows.map((r) => ({
      ...r,
      name: displayInfoById.get(r.userId)?.name ?? r.userId,
    }));

    return { ...notification, readers };
  });
}
