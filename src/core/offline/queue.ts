"use client";

import { getOfflineDB, type PendingAction } from "./db";

/** Nome do evento disparado no `window` sempre que a fila muda — o
 * `SyncProvider` escuta pra atualizar o contador sem precisar de um
 * polling constante em IndexedDB. */
export const QUEUE_CHANGED_EVENT = "mecanoerp:offline-queue-changed";

function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  }
}

export async function enqueuePendingAction(
  action: Omit<PendingAction, "createdAt" | "status">,
): Promise<void> {
  const db = await getOfflineDB();
  await db.put("pending_actions", { ...action, createdAt: Date.now(), status: "pending" });
  notifyQueueChanged();
}

export async function listPendingActions(module?: string): Promise<PendingAction[]> {
  const db = await getOfflineDB();
  const all = module
    ? await db.getAllFromIndex("pending_actions", "by-module", module)
    : await db.getAll("pending_actions");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getPendingAction(id: string): Promise<PendingAction | undefined> {
  const db = await getOfflineDB();
  return db.get("pending_actions", id);
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("pending_actions", id);
  notifyQueueChanged();
}

export async function markPendingActionStatus(
  id: string,
  status: PendingAction["status"],
  errorMessage?: string,
): Promise<void> {
  const db = await getOfflineDB();
  const existing = await db.get("pending_actions", id);
  if (!existing) return;
  await db.put("pending_actions", { ...existing, status, errorMessage });
}
