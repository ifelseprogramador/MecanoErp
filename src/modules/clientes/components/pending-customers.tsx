"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { listPendingActions, QUEUE_CHANGED_EVENT } from "@/core/offline/queue";
import type { PendingAction } from "@/core/offline/db";
import type { CustomerInput } from "../validation";

/**
 * Lista de clientes criados offline, ainda não sincronizados — a página
 * `clientes` (Server Component) não sabe que eles existem (não estão no
 * Postgres ainda), então isto entra como um complemento client-only
 * acima da tabela de verdade. Some sozinho quando sincroniza (o
 * `SyncProvider` chama `router.refresh()` depois, que refaz a busca no
 * servidor e o registro passa a aparecer na tabela normal).
 */
export function PendingCustomers() {
  const [pending, setPending] = useState<PendingAction[]>([]);

  useEffect(() => {
    function refresh() {
      listPendingActions("clientes").then(setPending);
    }
    refresh();
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, refresh);
  }, []);

  if (pending.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      {pending.map((action) => {
        const data = action.record as CustomerInput;
        return (
          <li key={action.id} className="flex items-center justify-between text-sm">
            <Link href={`/clientes/pendente?id=${action.id}`} className="hover:underline">
              {data.name}
            </Link>
            <Badge variant="outline" className="gap-1">
              <RefreshCw className="h-3 w-3" />
              {action.status === "error" ? "Erro" : "Pendente"}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
