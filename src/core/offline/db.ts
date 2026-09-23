"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * Uma ação de criação feita offline, esperando pra sincronizar. Escopo
 * de propósito: só CRIAR registros novos funciona offline por enquanto
 * (editar/apagar exigiriam reconciliar com o que mudou no servidor
 * enquanto esteve offline — mais complexo, deixado pra depois). Pra uma
 * oficina de balcão único, "consigo continuar cadastrando cliente/OS
 * mesmo sem internet" cobre o caso real.
 *
 * `id` é o MESMO id que o registro vai ter no banco (gerado no navegador
 * via `crypto.randomUUID()`, não pelo Postgres) — assim a página que
 * mostra o registro pendente e a página do registro já sincronizado
 * apontam pro mesmo id, sem trocar de URL depois de sincronizar.
 */
export interface PendingAction {
  id: string;
  module: string;
  entity: string;
  actionName: string;
  label: string;
  record: Record<string, unknown>;
  createdAt: number;
  status: "pending" | "syncing" | "error";
  errorMessage?: string;
}

interface OfflineDB extends DBSchema {
  pending_actions: {
    key: string;
    value: PendingAction;
    indexes: { "by-module": string };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

/** Só chamar do lado do cliente — IndexedDB não existe no servidor. */
export function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (typeof window === "undefined") {
    throw new Error("getOfflineDB só pode ser chamado no navegador.");
  }
  dbPromise ??= openDB<OfflineDB>("mecanoerp-offline", 1, {
    upgrade(db) {
      const store = db.createObjectStore("pending_actions", { keyPath: "id" });
      store.createIndex("by-module", "module");
    },
  });
  return dbPromise;
}
