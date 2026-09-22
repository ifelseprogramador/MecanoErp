import "server-only";
import { headers, cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { db } from "@/core/db";
import { memberships, organizations } from "@/db/schema";
import { logger, type Logger } from "@/core/logger";
import { isPlatformAdmin } from "@/core/platform-admin";
import { IMPERSONATION_COOKIE } from "@/core/impersonation";

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

/**
 * A organização (ou o membership da pessoa dentro dela) foi bloqueada
 * pelo dono da plataforma — normalmente por falta de pagamento. Ver
 * `core/admin/actions.ts#setOrganizationStatus` e a tela em `/admin`.
 */
export class OrganizationBlockedError extends Error {
  constructor(message = "Acesso bloqueado.") {
    super(message);
    this.name = "OrganizationBlockedError";
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
 * Se o cookie de modo suporte estiver presente E o usuário da sessão
 * atual for mesmo um platform admin agora (reconfirmado a cada chamada —
 * o cookie sozinho nunca é suficiente), devolve o id da organização que
 * ele está "acessando como". `null` em qualquer outro caso.
 */
async function getImpersonatedOrgId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const orgId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!orgId) return null;

  if (!(await isPlatformAdmin(userId))) {
    // Sessão comum com um cookie de suporte "órfão" (ex.: admin perdeu o
    // acesso). Nunca honrar — mas não é uma ação do próprio usuário, não
    // vale a pena tentar apagar o cookie aqui (Server Component é
    // somente leitura); a action de logout/stopImpersonation limpa.
    return null;
  }

  return orgId;
}

/**
 * A organização ativa do usuário + seu papel nela.
 *
 * O MVP não tem troca de organização (uma pessoa pertence a uma oficina só
 * — ver "Multi-tenant barato agora, pronto depois" no plano), então
 * simplesmente pega o primeiro membership. Trocar isso por uma organização
 * "ativa" escolhida pelo usuário é a mudança principal para virar SaaS.
 *
 * Exceção: um platform admin em modo suporte (ver `core/impersonation.ts`)
 * "vira" o dono da organização que está acessando, mesmo sem membership.
 */
export async function getActiveOrg() {
  const user = await getSession();
  if (!user) {
    throw new UnauthorizedError();
  }

  const impersonatedOrgId = await getImpersonatedOrgId(user.id);
  if (impersonatedOrgId) {
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name, status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, impersonatedOrgId))
      .limit(1);

    if (org) {
      return {
        userId: user.id,
        userEmail: user.email,
        organizationId: org.id,
        organizationName: org.name,
        role: "owner" as const,
        impersonating: true,
        organizationStatus: org.status,
      };
    }
    // Organização foi apagada durante o modo suporte — cai para o fluxo
    // normal abaixo (provavelmente vira NoActiveOrganizationError).
  }

  const [membership] = await db
    .select({
      organizationId: memberships.organizationId,
      role: memberships.role,
      membershipActive: memberships.active,
      organizationName: organizations.name,
      organizationStatus: organizations.status,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (!membership) {
    throw new NoActiveOrganizationError();
  }

  if (membership.organizationStatus === "blocked" || !membership.membershipActive) {
    throw new OrganizationBlockedError();
  }

  return {
    userId: user.id,
    userEmail: user.email,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    role: membership.role,
    impersonating: false as const,
    organizationStatus: "active" as const, // já teria lançado acima se bloqueada
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
  impersonating: boolean;
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
    impersonating: context.impersonating,
    log: logger.withContext({
      requestId,
      userId: context.userId,
      organizationId: context.organizationId,
      ...(context.impersonating && { impersonating: true }),
    }),
  };
}
