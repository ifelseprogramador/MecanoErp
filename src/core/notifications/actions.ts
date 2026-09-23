"use server";

import { revalidatePath } from "next/cache";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { notificationReads } from "@/db/schema/notifications";

/** Marca como lida pra ESTA pessoa (`userId`) — não afeta o resto da
 * organização, cada pessoa tem sua própria leitura. `onConflictDoNothing`
 * porque `(notificationId, userId)` é único: clicar duas vezes (ou dois
 * componentes tentando marcar ao mesmo tempo) não é erro. */
export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  const { db, organizationId, userId, log } = await withOrg();

  await db
    .insert(notificationReads)
    .values({ notificationId, userId, organizationId })
    .onConflictDoNothing();

  log.info("notificacoes.marcar_lida", { notificationId });
  revalidatePath("/", "layout");
  return { ok: true };
}
