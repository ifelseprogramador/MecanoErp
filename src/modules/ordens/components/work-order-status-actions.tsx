"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/core/action-result";
import type { WorkOrderStatus } from "../domain";

const NEXT_STEP: Partial<Record<WorkOrderStatus, { status: WorkOrderStatus; label: string }>> = {
  orcamento: { status: "aprovada", label: "Aprovar orçamento" },
  aprovada: { status: "em_andamento", label: "Iniciar serviço" },
  em_andamento: { status: "concluida", label: "Concluir OS" },
  concluida: { status: "entregue", label: "Marcar como entregue" },
};

const CANCELABLE: WorkOrderStatus[] = ["orcamento", "aprovada", "em_andamento"];

export function WorkOrderStatusActions({
  orderId,
  status,
  transitionAction,
}: {
  orderId: string;
  status: WorkOrderStatus;
  transitionAction: (orderId: string, nextStatus: WorkOrderStatus) => Promise<ActionResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleTransition(next: WorkOrderStatus) {
    startTransition(async () => {
      const result = await transitionAction(orderId, next);
      if (result.ok) {
        toast.success("Status atualizado.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Não foi possível atualizar o status.");
      }
    });
  }

  const nextStep = NEXT_STEP[status];

  return (
    <div className="flex items-center gap-2">
      {nextStep && (
        <Button disabled={isPending} onClick={() => handleTransition(nextStep.status)}>
          {nextStep.label}
        </Button>
      )}
      {CANCELABLE.includes(status) && (
        <Button
          variant="destructive"
          disabled={isPending}
          onClick={() => handleTransition("cancelada")}
        >
          Cancelar OS
        </Button>
      )}
    </div>
  );
}
