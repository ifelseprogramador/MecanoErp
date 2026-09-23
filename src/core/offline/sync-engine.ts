"use client";

import { logger } from "@/core/logger";
import { listPendingActions, markPendingActionStatus, removePendingAction } from "./queue";
import { REPLAY_HANDLERS } from "./replay-handlers";

/**
 * Roda a fila de ações pendentes contra o servidor de verdade, na ordem
 * em que foram criadas (importante: um veículo criado offline referencia
 * o cliente pelo id — se o cliente ainda nem tiver sido sincronizado, o
 * INSERT do veículo falha por FK; por isso sempre em sequência, nunca em
 * paralelo, e para no primeiro erro em vez de tentar os próximos fora de
 * ordem).
 */
export async function runSyncQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await listPendingActions();
  let synced = 0;
  let failed = 0;

  for (const action of pending) {
    if (action.status === "syncing") continue; // já em andamento (outra aba, outro disparo)

    const handler = REPLAY_HANDLERS[`${action.module}:${action.actionName}`];
    if (!handler) {
      logger.error("offline.sync.handler_desconhecido", {
        module: action.module,
        actionName: action.actionName,
      });
      failed += 1;
      continue;
    }

    await markPendingActionStatus(action.id, "syncing");
    try {
      const result = await handler(action.record, action.id);
      if (result.ok) {
        await removePendingAction(action.id);
        synced += 1;
      } else {
        await markPendingActionStatus(action.id, "error", result.message);
        failed += 1;
        // Uma ação com erro de verdade (ex.: validação que passou offline
        // mas o servidor rejeita) não deve travar as próximas — mas uma
        // ação que falhou por FK (depende de outra ainda não
        // sincronizada) sim, precisa parar aqui pra não sincronizar fora
        // de ordem. Sem um jeito barato de distinguir os dois casos,
        // paramos sempre — mais seguro que arriscar ordem errada.
        break;
      }
    } catch (err) {
      await markPendingActionStatus(action.id, "error", "Erro inesperado ao sincronizar.");
      logger.error("offline.sync.falhou", { actionId: action.id, err });
      failed += 1;
      break;
    }
  }

  return { synced, failed };
}
