import "server-only";
import { desc, eq } from "drizzle-orm";
import { runWithUserContext, type Database } from "@/core/db";
import { auditLog } from "@/db/schema";
import { logger } from "@/core/logger";

/**
 * Registra uma linha na trilha de auditoria. Nunca lança — uma falha ao
 * gravar auditoria não pode derrubar a ação de admin/organização que a
 * chamou (só é logado). Chamar depois que a ação principal já teve
 * sucesso.
 *
 * Abre a PRÓPRIA transação (`runWithUserContext(input.actorUserId, ...)`)
 * em vez de receber um `tx` de quem chamou: como nunca lança e é sempre
 * best-effort/desacoplado da ação principal (nunca precisou de
 * atomicidade com ela), não faz sentido amarrar ao `withDb` de quem
 * chamou — e isso evita precisar tocar as ~14 chamadas espalhadas em
 * `core/admin/actions.ts`/`core/live-support/actions.ts`. A policy
 * `audit_log_insert_own_org` (ver migrations-custom/0010_rls_ativa.sql)
 * só libera o insert quando `actor_user_id = current_app_user_id()` —
 * por isso o `userId` do input tem que ser o mesmo que abre a transação.
 */
export async function recordAudit(input: {
  actorUserId: string;
  organizationId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await runWithUserContext(input.actorUserId, (tx) =>
      tx.insert(auditLog).values({
        actorUserId: input.actorUserId,
        organizationId: input.organizationId ?? null,
        action: input.action,
        metadata: input.metadata ?? null,
      }),
    );
  } catch (err) {
    logger.error("audit.gravar_falhou", { err, action: input.action });
  }
}

/**
 * Recebe `db` explícito (o `tx` de `requireAdmin().withDb(...)`) — só o
 * admin lê o histórico de auditoria (`audit_log_admin_only`), então
 * precisa rodar na mesma transação já autenticada como esse admin.
 */
export async function getAuditLogForOrg(db: Database, organizationId: string, limit = 50) {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.organizationId, organizationId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
