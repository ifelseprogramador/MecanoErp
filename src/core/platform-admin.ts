import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { platformAdmins } from "@/db/schema";

/**
 * Checagem crua de "esse usuário é dono da plataforma?" — sem lançar,
 * sem log. Compartilhada por `core/admin-auth.ts#requireAdmin()` (bloqueia
 * quem não é admin) e `core/auth.ts#getActiveOrg()` (permite o modo
 * suporte/impersonation). Fica num arquivo à parte só para evitar import
 * circular entre os dois.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const [admin] = await db
    .select({ userId: platformAdmins.userId })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);

  return Boolean(admin);
}
