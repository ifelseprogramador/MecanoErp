import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { db } from "@/core/db";
import { memberships, organizations } from "@/db/schema";
import { logger, type Logger } from "@/core/logger";

export class UnauthorizedError extends Error {
  constructor(message = "Usuário não autenticado.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class NoActiveOrganizationError extends Error {
  constructor(message = "Usuário não pertence a nenhuma organização.") {
    super(message);
    this.name = "NoActiveOrganizationError";
  }
}

/** Sessão do usuário autenticado, lida do cookie do Supabase Auth. */
export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * A organização ativa do usuário + seu papel nela.
 *
 * O MVP não tem troca de organização (uma pessoa pertence a uma oficina só
 * — ver "Multi-tenant barato agora, pronto depois" no plano), então
 * simplesmente pega o primeiro membership. Trocar isso por uma organização
 * "ativa" escolhida pelo usuário é a mudança principal para virar SaaS.
 */
export async function getActiveOrg() {
  const user = await getSession();
  if (!user) {
    throw new UnauthorizedError();
  }

  const [membership] = await db
    .select({
      organizationId: memberships.organizationId,
      role: memberships.role,
      organizationName: organizations.name,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (!membership) {
    throw new NoActiveOrganizationError();
  }

  return {
    userId: user.id,
    userEmail: user.email,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    role: membership.role,
  };
}

async function getRequestId(): Promise<string | undefined> {
  try {
    const headerList = await headers();
    return headerList.get("x-request-id") ?? undefined;
  } catch {
    // Fora de um request (ex.: script de seed) não há headers.
    return undefined;
  }
}

export interface OrgContext {
  db: typeof db;
  userId: string;
  organizationId: string;
  role: "owner" | "staff";
  log: Logger;
}

/**
 * Ponto de entrada padrão de toda Server Action e query de módulo:
 * resolve a sessão + organização ativa e devolve um logger já contextualizado
 * (requestId, userId, organizationId) — nenhum módulo deve montar esse
 * contexto na mão. Lança `UnauthorizedError`/`NoActiveOrganizationError`
 * quando não há sessão ou organização válida.
 *
 * Uso:
 *   const { db, organizationId, log } = await withOrg();
 *   log.info("clientes.listar");
 *   return db.query.customers.findMany({ where: eq(customers.organizationId, organizationId) });
 */
export async function withOrg(): Promise<OrgContext> {
  const requestId = await getRequestId();
  const context = await getActiveOrg().catch((err) => {
    logger.warn("auth.acesso_negado", {
      requestId,
      reason: err instanceof Error ? err.name : "unknown",
    });
    throw err;
  });

  return {
    db,
    userId: context.userId,
    organizationId: context.organizationId,
    role: context.role,
    log: logger.withContext({
      requestId,
      userId: context.userId,
      organizationId: context.organizationId,
    }),
  };
}
