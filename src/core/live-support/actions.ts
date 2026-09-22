"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { withOrg, getSession, getActiveOrg } from "@/core/auth";
import { requireAdmin } from "@/core/admin-auth";
import { isPlatformAdmin } from "@/core/platform-admin";
import { db } from "@/core/db";
import { liveSessions, memberships, organizations } from "@/db/schema";
import { recordAudit } from "@/core/admin/audit";
import { sendBroadcast as broadcast } from "@/core/supabase/realtime-sender";
import type { ActionResult } from "@/core/action-result";
import {
  adminSupportInboxChannelName,
  liveSessionChannelName,
  orgSupportChannelName,
} from "./realtime";

const OPEN_STATUSES = ["pending", "active"] as const;

interface SessionActionResult extends ActionResult {
  sessionId?: string;
}

/** Admin pede acesso à tela de uma oficina. Ver core/admin/components/live-support-card.tsx. */
export async function requestSupportAccess(organizationId: string): Promise<SessionActionResult> {
  const { userId, log } = await requireAdmin();

  const [existing] = await db
    .select({ id: liveSessions.id })
    .from(liveSessions)
    .where(
      and(
        eq(liveSessions.organizationId, organizationId),
        inArray(liveSessions.status, OPEN_STATUSES),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: false, message: "Já existe uma sessão de suporte em aberto para esta oficina." };
  }

  const [session] = await db
    .insert(liveSessions)
    .values({ organizationId, initiatedBy: "admin", adminUserId: userId, status: "pending" })
    .returning({ id: liveSessions.id });

  log.warn("live_support.solicitar", { organizationId, sessionId: session.id });
  await recordAudit({ actorUserId: userId, organizationId, action: "live_support.solicitar" });
  await broadcast(orgSupportChannelName(organizationId), "request", { sessionId: session.id });

  revalidatePath(`/admin/organizacoes/${organizationId}`);
  return { ok: true, sessionId: session.id };
}

/** Usuário da oficina chama o suporte. Botão em (app), ver live-support-widget.tsx. */
export async function callForSupport(): Promise<SessionActionResult> {
  const { userId, organizationId, log } = await withOrg();
  const { organizationName } = await getActiveOrg();

  const [existing] = await db
    .select({ id: liveSessions.id })
    .from(liveSessions)
    .where(
      and(
        eq(liveSessions.organizationId, organizationId),
        inArray(liveSessions.status, OPEN_STATUSES),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: true, sessionId: existing.id }; // já tem uma pendente/ativa, só devolve
  }

  const [session] = await db
    .insert(liveSessions)
    .values({ organizationId, initiatedBy: "user", requestedByUserId: userId, status: "pending" })
    .returning({ id: liveSessions.id });

  log.info("live_support.chamar", { sessionId: session.id });
  await recordAudit({ actorUserId: userId, organizationId, action: "live_support.chamar" });
  await broadcast(adminSupportInboxChannelName(), "request", {
    sessionId: session.id,
    organizationId,
    organizationName,
  });

  return { ok: true, sessionId: session.id };
}

/** Usuário aceita um pedido que o admin abriu (startImpersonation-like, mas só a visão). */
export async function approveSupportSession(sessionId: string): Promise<ActionResult> {
  const { userId, organizationId, log } = await withOrg();

  const [session] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!session || session.organizationId !== organizationId || session.status !== "pending") {
    return { ok: false, message: "Solicitação não encontrada ou já respondida." };
  }

  await db
    .update(liveSessions)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(liveSessions.id, sessionId));

  log.info("live_support.aprovar", { sessionId });
  await recordAudit({ actorUserId: userId, organizationId, action: "live_support.aprovar" });
  await broadcast(liveSessionChannelName(sessionId), "status", { status: "active" });

  return { ok: true };
}

/** Usuário recusa um pedido que o admin abriu. */
export async function declineSupportSession(sessionId: string): Promise<ActionResult> {
  const { userId, organizationId, log } = await withOrg();

  const [session] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!session || session.organizationId !== organizationId || session.status !== "pending") {
    return { ok: false, message: "Solicitação não encontrada ou já respondida." };
  }

  await db.update(liveSessions).set({ status: "declined" }).where(eq(liveSessions.id, sessionId));

  log.info("live_support.recusar", { sessionId });
  await recordAudit({ actorUserId: userId, organizationId, action: "live_support.recusar" });
  await broadcast(liveSessionChannelName(sessionId), "status", { status: "declined" });

  return { ok: true };
}

/** Admin aceita um pedido que o usuário abriu ("Chamar suporte"). */
export async function acceptSupportRequest(sessionId: string): Promise<ActionResult> {
  const { userId, log } = await requireAdmin();

  const [session] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!session || session.status !== "pending") {
    return { ok: false, message: "Solicitação não encontrada ou já respondida." };
  }

  await db
    .update(liveSessions)
    .set({ adminUserId: userId, status: "active", startedAt: new Date() })
    .where(eq(liveSessions.id, sessionId));

  log.warn("live_support.aceitar", { sessionId, organizationId: session.organizationId });
  await recordAudit({
    actorUserId: userId,
    organizationId: session.organizationId,
    action: "live_support.aceitar",
  });
  await broadcast(liveSessionChannelName(sessionId), "status", { status: "active" });

  revalidatePath(`/admin/organizacoes/${session.organizationId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/** Concede/revoga controle de mouse/teclado durante uma sessão já ativa — sempre uma
 * decisão do usuário, nunca do admin (ver docs/decisoes.md). */
export async function setControlGranted(
  sessionId: string,
  granted: boolean,
): Promise<ActionResult> {
  const { userId, organizationId, log } = await withOrg();

  const [session] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!session || session.organizationId !== organizationId || session.status !== "active") {
    return { ok: false, message: "Sessão não encontrada ou não está ativa." };
  }

  await db
    .update(liveSessions)
    .set({ controlGranted: granted })
    .where(eq(liveSessions.id, sessionId));

  log.info(granted ? "live_support.conceder_controle" : "live_support.revogar_controle", {
    sessionId,
  });
  await recordAudit({
    actorUserId: userId,
    organizationId,
    action: granted ? "live_support.conceder_controle" : "live_support.revogar_controle",
  });
  await broadcast(liveSessionChannelName(sessionId), "control", { granted });

  return { ok: true };
}

/**
 * Salva o instantâneo completo mais recente para a sessão — chamado pelo
 * widget do usuário a cada `record()`/`takeFullSnapshot()`, com
 * `{ meta, snapshot }` (o evento Meta mais recente — que revela o iframe
 * do Replayer, ver live-session-viewer.tsx — junto do FullSnapshot em
 * si). Não passa pelo Broadcast: o DOM inteiro da tela gravada passa
 * fácil de 200KB, grande demais para uma mensagem de Realtime (que
 * aceita o envio mas descarta silenciosamente quando é grande demais). O
 * admin busca sob demanda (ver getFullSnapshot).
 */
export async function saveFullSnapshot(
  sessionId: string,
  snapshot: unknown,
): Promise<ActionResult> {
  const { organizationId } = await withOrg();

  const [session] = await db
    .select({ id: liveSessions.id })
    .from(liveSessions)
    .where(
      and(
        eq(liveSessions.id, sessionId),
        eq(liveSessions.organizationId, organizationId),
        inArray(liveSessions.status, OPEN_STATUSES),
      ),
    )
    .limit(1);
  if (!session) {
    return { ok: false, message: "Sessão não encontrada ou não está ativa." };
  }

  await db
    .update(liveSessions)
    .set({ lastFullSnapshot: snapshot })
    .where(eq(liveSessions.id, sessionId));

  return { ok: true };
}

interface SnapshotResult extends ActionResult {
  snapshot?: unknown;
}

/** Busca o instantâneo completo mais recente — chamado pelo LiveSessionViewer do admin ao montar/reconectar. */
export async function getFullSnapshot(sessionId: string): Promise<SnapshotResult> {
  await requireAdmin();

  const [session] = await db
    .select({ lastFullSnapshot: liveSessions.lastFullSnapshot })
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!session) {
    return { ok: false, message: "Sessão não encontrada." };
  }

  return { ok: true, snapshot: session.lastFullSnapshot };
}

/**
 * Encerra a sessão — de qualquer um dos dois lados: quem pediu, o admin
 * que está nela, qualquer platform admin (rede de segurança) ou qualquer
 * membro daquela oficina.
 */
export async function endLiveSession(sessionId: string): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Não autenticado." };

  const [session] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!session) return { ok: false, message: "Sessão não encontrada." };
  if (session.status === "ended") return { ok: true };

  const [membership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(eq(memberships.userId, user.id), eq(memberships.organizationId, session.organizationId)),
    )
    .limit(1);

  const allowed =
    user.id === session.requestedByUserId ||
    user.id === session.adminUserId ||
    Boolean(membership) ||
    (await isPlatformAdmin(user.id));

  if (!allowed) {
    return { ok: false, message: "Sem permissão para encerrar esta sessão." };
  }

  await db
    .update(liveSessions)
    .set({ status: "ended", endedAt: new Date(), controlGranted: false })
    .where(eq(liveSessions.id, sessionId));

  await recordAudit({
    actorUserId: user.id,
    organizationId: session.organizationId,
    action: "live_support.encerrar",
  });
  await broadcast(liveSessionChannelName(sessionId), "status", { status: "ended" });

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);
  if (org) {
    revalidatePath(`/admin/organizacoes/${org.id}`);
  }
  revalidatePath("/admin");

  return { ok: true };
}
