"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PendingListHint } from "@/components/pending-list-hint";
import { listPendingActions, QUEUE_CHANGED_EVENT } from "@/core/offline/queue";
import type { PendingAction } from "@/core/offline/db";
import type { VehicleInput } from "../validation";

/**
 * Lista de veículos criados offline, ainda não sincronizados — mesmo
 * padrão de `modules/clientes/components/pending-customers.tsx`.
 */
export function PendingVehicles() {
  const [pending, setPending] = useState<PendingAction[]>([]);

  useEffect(() => {
    function refresh() {
      listPendingActions("veiculos").then(setPending);
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
        {pending.map((action) => {
          const data = action.record as VehicleInput;
          return (
            <li key={action.id} className="flex items-center justify-between text-sm">
              <Link href={`/veiculos/pendente?id=${action.id}`} className="hover:underline">
                {data.plate}
              </Link>
              <Badge variant="outline" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                {action.status === "error" ? "Erro" : "Pendente"}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
