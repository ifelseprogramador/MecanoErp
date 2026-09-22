import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getSession } from "@/core/auth";
import { db } from "@/core/db";
import { platformAdmins } from "@/db/schema";
import { logger, type Logger } from "@/core/logger";

export class NotPlatformAdminError extends Error {
  constructor(message = "Acesso restrito ao dono da plataforma.") {
    super(message);
    this.name = "NotPlatformAdminError";
  }
}

async function getRequestId(): Promise<string | undefined> {
  try {
    return (await headers()).get("x-request-id") ?? undefined;
  } catch {
    return undefined;
  }
}

export interface AdminContext {
  db: typeof db;
  userId: string;
  log: Logger;
}

/**
 * Ponto de entrada de toda query/action da área `/admin`. Diferente de
 * `withOrg()`, NÃO filtra por organização — a conexão do app já enxerga
 * tudo (ver docs/decisoes.md, "bypassrls"), então a única proteção real
 * de um dado de admin é esta checagem acontecer antes de qualquer query.
 * Nunca pule esta chamada numa rota/action nova de `/admin`.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const requestId = await getRequestId();
  const user = await getSession();

  if (!user) {
    logger.warn("admin.acesso_negado", { requestId, reason: "sem_sessao" });
    throw new NotPlatformAdminError("Faça login para acessar a área administrativa.");
  }

  const [admin] = await db
    .select({ userId: platformAdmins.userId })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, user.id))
    .limit(1);

  if (!admin) {
    logger.warn("admin.acesso_negado", { requestId, userId: user.id, reason: "nao_e_admin" });
    throw new NotPlatformAdminError();
  }

  return {
    db,
    userId: user.id,
    log: logger.withContext({ requestId, userId: user.id, module: "admin" }),
  };
}
