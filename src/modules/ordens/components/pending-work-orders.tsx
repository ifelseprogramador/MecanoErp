"use client";

import { useEffect, useState } from "react";
import { ActionLink } from "@/components/action-link";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PendingListHint } from "@/components/pending-list-hint";
import { listPendingActions, QUEUE_CHANGED_EVENT } from "@/core/offline/queue";
import type { PendingAction } from "@/core/offline/db";

/**
 * Lista de ordens de serviço criadas offline, ainda não sincronizadas —
 * mesmo padrão de `modules/clientes/components/pending-customers.tsx`.
 * Sem número sequencial ainda (só existe depois de sincronizar), por
 * isso mostra "Nova OS" em vez de um número.
 */
export function PendingWorkOrders() {
  const [pending, setPending] = useState<PendingAction[]>([]);

  useEffect(() => {
    function refresh() {
      listPendingActions("ordens").then(setPending);
    }
    refresh();
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, refresh);
  }, []);

  if (pending.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <PendingListHint />
      <ul className="flex flex-col gap-2">
        {pending.map((action) => (
          <li key={action.id} className="flex items-center justify-between text-sm">
            <ActionLink href={`/ordens/pendente?id=${action.id}`}>Nova OS</ActionLink>
            <Badge variant="outline" className="gap-1">
              <RefreshCw className="h-3 w-3" />
              {action.status === "error" ? "Erro" : "Pendente"}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
