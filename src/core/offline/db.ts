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

const LEGACY_DB_NAME = "mecanoerp-offline";

/**
 * A fila é POR PESSOA E POR OFICINA: o nome do banco do navegador inclui
 * `organizationId:userId`, lido de `<div id="offline-scope">` que o layout
 * (`app/(app)/layout.tsx`) renderiza no servidor. Antes era um IndexedDB
 * único por navegador — dois funcionários no mesmo computador viam e
 * sincronizavam a fila um do outro (e sob o usuário errado). Sem o elemento
 * (modo suporte, fora do app) cai no nome antigo.
 */
function currentScope(): string | null {
  return document.getElementById("offline-scope")?.dataset.scope ?? null;
}

function openNamedDB(name: string) {
  return openDB<OfflineDB>(name, 1, {
    upgrade(db) {
      const store = db.createObjectStore("pending_actions", { keyPath: "id" });
      store.createIndex("by-module", "module");
    },
  });
}

/**
 * Registros pendentes do banco ANTIGO (único por navegador) passam para o
 * banco de quem abrir o app primeiro depois da atualização, e saem do
 * antigo — sem isso, quem tinha cadastro offline ainda não sincronizado o
 * perderia na troca. Melhor esforço: qualquer falha só deixa os registros
 * onde estavam.
 */
async function adoptLegacyQueue(scoped: IDBPDatabase<OfflineDB>) {
  try {
    const known = (await indexedDB.databases?.()) ?? [];
    if (!known.some((d) => d.name === LEGACY_DB_NAME)) return;
    const legacy = await openNamedDB(LEGACY_DB_NAME);
    const records = await legacy.getAll("pending_actions");
    for (const record of records) await scoped.put("pending_actions", record);
    await legacy.clear("pending_actions");
    legacy.close();
  } catch {
    // mantém o que estiver no banco antigo
  }
}

const dbPromises = new Map<string, Promise<IDBPDatabase<OfflineDB>>>();

/** Só chamar do lado do cliente — IndexedDB não existe no servidor. */
export function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (typeof window === "undefined") {
    throw new Error("getOfflineDB só pode ser chamado no navegador.");
  }
  const scope = currentScope();
  const name = scope ? `${LEGACY_DB_NAME}-${scope}` : LEGACY_DB_NAME;
  let promise = dbPromises.get(name);
  if (!promise) {
    promise = openNamedDB(name).then(async (db) => {
      if (scope) await adoptLegacyQueue(db);
      return db;
    });
    dbPromises.set(name, promise);
  }
  return promise;
}
