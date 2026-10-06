import { applyDiscount, multiplyCents, sumCents, type Cents } from "@/core/money";

export type WorkOrderStatus =
  "orcamento" | "aprovada" | "em_andamento" | "concluida" | "entregue" | "cancelada";

/**
 * Transições válidas de status da OS. Testado sem banco (funções puras) —
 * é a máquina de estados que `actions.ts#transitionWorkOrderStatus`
 * consulta antes de qualquer `UPDATE`, pra nunca deixar o banco num
 * estado que a UI não sabe representar (ex.: pular de "orcamento" direto
 * pra "concluida").
 */
const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  orcamento: ["aprovada", "cancelada"],
  aprovada: ["em_andamento", "cancelada"],
  em_andamento: ["concluida", "cancelada"],
  concluida: ["entregue"],
  entregue: [],
  cancelada: [],
};

export function isValidTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: WorkOrderStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

/** Cabeçalho (cliente, veículo, relato, diagnóstico, desconto) só edita
 * enquanto a OS é orçamento ou aprovada. Antes só a tela respeitava isso;
 * agora `actions.ts` também recusa — outra pessoa pode ter mudado o status
 * depois que esta abriu a ficha. */
export function isHeaderEditable(status: WorkOrderStatus): boolean {
  return status === "orcamento" || status === "aprovada";
}

/** Itens editam também com a OS em andamento (peça extra, serviço extra). */
export function areItemsEditable(status: WorkOrderStatus): boolean {
  return isHeaderEditable(status) || status === "em_andamento";
}

export interface WorkOrderItemLike {
  quantity: number;
  unitPriceCents: Cents;
}

/** Total de uma linha de item — mesma fórmula da coluna gerada no banco
 * (`round(quantity * unit_price_cents)`), aqui pra validar no cliente
 * antes de enviar e pra testar a regra isoladamente. */
export function calculateItemTotal(item: WorkOrderItemLike): Cents {
  return multiplyCents(item.unitPriceCents, item.quantity);
}

/** Total da OS: soma dos itens, com o desconto aplicado por cima (nunca
 * fica negativo — desconto maior que o subtotal vira zero). */
export function calculateOrderTotal(items: WorkOrderItemLike[], discountCents: Cents): Cents {
  const subtotal = sumCents(items.map(calculateItemTotal));
  return applyDiscount(subtotal, discountCents);
}
