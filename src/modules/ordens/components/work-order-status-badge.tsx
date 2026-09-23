import { Badge } from "@/components/ui/badge";
import type { WorkOrderStatus } from "../domain";

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
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

// Cores extras além das variantes padrão do Badge — cada status do fluxo
// fica visualmente distinto numa lista (não só "cinza" pra tudo que não é
// laranja/vermelho), ajuda a identificar o estado da OS de relance.
const EXTRA_CLASSES: Partial<Record<WorkOrderStatus, string>> = {
  aprovada: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  concluida: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  entregue: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
};

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <Badge variant={VARIANTS[status]} className={EXTRA_CLASSES[status]}>
      {WORK_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
