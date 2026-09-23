import { Badge } from "@/components/ui/badge";
import type { WorkOrderStatus } from "../domain";

const LABELS: Record<WorkOrderStatus, string> = {
  orcamento: "Orçamento",
  aprovada: "Aprovada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

const VARIANTS: Record<WorkOrderStatus, "secondary" | "default" | "destructive" | "outline"> = {
  orcamento: "outline",
  aprovada: "secondary",
  em_andamento: "default",
  concluida: "secondary",
  entregue: "secondary",
  cancelada: "destructive",
};

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
