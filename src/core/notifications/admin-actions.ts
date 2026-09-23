"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/core/admin-auth";
import type { ActionResult } from "@/core/action-result";
import { notifications } from "@/db/schema/notifications";
import { parseNotificationFormData } from "./validation";

export async function createNotification(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, userId, log } = await requireAdmin();

  const parsed = parseNotificationFormData(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const [notification] = await db
    .insert(notifications)
    .values({
      title: parsed.data.title,
      body: parsed.data.body,
      organizationId: parsed.data.organizationId ?? null,
      createdBy: userId,
    })
    .returning({ id: notifications.id });

  log.info("notificacoes.criar", {
    notificationId: notification.id,
    organizationId: parsed.data.organizationId ?? "todas",
  });
  revalidatePath("/admin/notificacoes");
  redirect("/admin/notificacoes");
}

export async function updateNotification(
  notificationId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, log } = await requireAdmin();

  const parsed = parseNotificationFormData(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await db
    .update(notifications)
    .set({
      title: parsed.data.title,
      body: parsed.data.body,
      organizationId: parsed.data.organizationId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(notifications.id, notificationId))
    .returning({ id: notifications.id });

  if (result.length === 0) {
    return { ok: false, message: "Notificação não encontrada." };
  }

  log.info("notificacoes.atualizar", { notificationId });
  revalidatePath("/admin/notificacoes");
  return { ok: true };
}

export async function deleteNotification(notificationId: string): Promise<ActionResult> {
  const { db, log } = await requireAdmin();

  await db.delete(notifications).where(eq(notifications.id, notificationId));

  log.info("notificacoes.remover", { notificationId });
  revalidatePath("/admin/notificacoes");
  return { ok: true };
}

export async function deleteAllNotifications(): Promise<ActionResult> {
  const { db, log } = await requireAdmin();

  await db.delete(notifications);

  log.info("notificacoes.remover_todas");
  revalidatePath("/admin/notificacoes");
  return { ok: true };
}
