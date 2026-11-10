import { z } from "zod";
import { parseReaisInput } from "@/core/money";

export const workOrderHeaderSchema = z.object({
  customerId: z.uuid("Selecione um cliente."),
  vehicleId: z.uuid("Selecione um veículo."),
  kmEntrada: z.coerce.number().int().min(0).optional(),
  relatoCliente: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  diagnostico: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  discountCents: z.coerce.number().int().min(0).default(0),
});

export type WorkOrderHeaderInput = z.infer<typeof workOrderHeaderSchema>;

// `FormData.get` devolve `null` para campo que não foi enviado (ex.: cadastro
// rápido do modo Fácil, que só manda alguns campos). Ausente = vazio = opcional;
// sem isso o `null` chegava ao `z.coerce`/`z.enum` e virava erro num campo que
// a tela nem mostra.
function emptyToUndefined(value: FormDataEntryValue | null) {
  return value === "" || value === null ? undefined : value;
}

export function parseWorkOrderHeaderFormData(formData: FormData) {
  const discountCents = parseReaisInput(String(formData.get("discount") ?? "0")) ?? 0;
  return workOrderHeaderSchema.safeParse({
    customerId: formData.get("customerId"),
    vehicleId: formData.get("vehicleId"),
    kmEntrada: emptyToUndefined(formData.get("kmEntrada")),
    relatoCliente: emptyToUndefined(formData.get("relatoCliente")),
    diagnostico: emptyToUndefined(formData.get("diagnostico")),
    discountCents,
  });
}

export const workOrderItemSchema = z.object({
  type: z.enum(["servico", "peca"]),
  description: z.string().trim().min(1, "Informe a descrição."),
  quantity: z.coerce.number().positive("A quantidade precisa ser maior que zero."),
  unitPriceCents: z.coerce.number().int().min(0),
});

export type WorkOrderItemInput = z.infer<typeof workOrderItemSchema>;

/**
 * Itens enviados de uma vez pelo assistente do modo Fácil (campo `itemsJson`,
 * ver `components/facil/facil-search.tsx#serializeLines`). Cada item passa
 * pela MESMA regra do item avulso (`workOrderItemSchema`).
 */
export function parseWorkOrderItemsPayload(raw: FormDataEntryValue | null) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { success: true as const, data: [] as WorkOrderItemInput[] };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { success: false as const, error: "Não consegui ler os itens. Tente de novo." };
  }
  if (!Array.isArray(json) || json.length > 100) {
    return { success: false as const, error: "Itens inválidos (máximo de 100 por ordem)." };
  }
  const items: WorkOrderItemInput[] = [];
  for (const entry of json) {
    const row = (entry ?? {}) as Record<string, unknown>;
    const parsed = workOrderItemSchema.safeParse({
      type: row.type,
      description: row.label,
      quantity: row.quantity,
      unitPriceCents: row.unitPriceCents,
    });
    if (!parsed.success) {
      const name = typeof row.label === "string" && row.label ? `“${row.label}”` : "um item";
      return {
        success: false as const,
        error: `Confira ${name}: ${parsed.error.issues[0]?.message ?? "dados inválidos"}`,
      };
    }
    items.push(parsed.data);
  }
  return { success: true as const, data: items };
}

export function parseWorkOrderItemFormData(formData: FormData) {
  const unitPriceCents = parseReaisInput(String(formData.get("unitPrice") ?? ""));
  return workOrderItemSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unitPriceCents: unitPriceCents ?? undefined,
  });
}
