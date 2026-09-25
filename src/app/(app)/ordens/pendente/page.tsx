"use client";

import { useEffect, useState } from "react";
import { ActionLink } from "@/components/action-link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/core/money";
import { getPendingAction } from "@/core/offline/queue";
import type { PendingAction } from "@/core/offline/db";
import type { WorkOrderHeaderInput } from "@/modules/ordens/validation";

/**
 * Ficha de uma OS criada OFFLINE — mesmo padrão de
 * `(app)/clientes/pendente/page.tsx`. Diferença: nunca mostra número
 * sequencial (não existe ainda — só é atribuído no insert de verdade,
 * ver `modules/ordens/actions.ts#createWorkOrderRecord`) e não tem
 * editor de itens (itens só entram depois de sincronizar de verdade,
 * na página `/ordens/[id]`).
 */
export default function PendingWorkOrderPage() {
  return <PendingWorkOrderContent />;
}

function PendingWorkOrderContent() {
  const [id, setId] = useState<string | null>(null);
  const [action, setAction] = useState<PendingAction | null | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(new URLSearchParams(window.location.search).get("id") ?? "");
  }, []);

  useEffect(() => {
    if (!id) return;
    getPendingAction(id).then((found) => setAction(found ?? null));
  }, [id]);

  if (id === null || (action === undefined && id)) {
    return <p className="text-muted-foreground p-6 text-sm">Carregando...</p>;
  }

  if (!action) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          Este registro pendente não foi encontrado neste navegador — ou já sincronizou. Confira{" "}
          {id && (
            <>
              <ActionLink href={`/ordens/${id}`} inline>
                a ordem
              </ActionLink>{" "}
              ou volte pra{" "}
            </>
          )}
          <ActionLink href="/ordens" icon={ArrowRight} inline>
            lista de ordens de serviço
          </ActionLink>
          .
        </p>
      </div>
    );
  }

  const data = action.record as WorkOrderHeaderInput;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Nova ordem de serviço</h1>
        <Badge variant="outline" className="gap-1">
          <RefreshCw className="h-3 w-3" />
          {action.status === "error" ? "Erro ao sincronizar" : "Pendente de sincronização"}
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm">
        Criada offline — o número sequencial só é definido quando sincronizar de verdade (evita
        colisão com outras OSs criadas ao mesmo tempo). Os itens também só podem ser adicionados
        depois de sincronizar.
        {action.status === "error" && action.errorMessage && (
          <span className="text-destructive block">{action.errorMessage}</span>
        )}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Dados da OS</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label="Km de entrada" value={data.kmEntrada?.toString() || "—"} />
          <Field label="Relato do cliente" value={data.relatoCliente || "—"} />
          <Field label="Diagnóstico" value={data.diagnostico || "—"} />
          <Field label="Desconto" value={formatCents(data.discountCents)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
