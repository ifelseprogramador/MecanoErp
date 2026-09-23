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

function emptyToUndefined(value: FormDataEntryValue | null) {
  return value === "" ? undefined : value;
}

export function parseWorkOrderHeaderFormData(formData: FormData) {
  const discountCents = parseReaisInput(String(formData.get("discount") ?? "0")) ?? 0;
  return workOrderHeaderSchema.safeParse({
    customerId: formData.get("customerId"),
    vehicleId: formData.get("vehicleId"),
    kmEntrada: emptyToUndefined(formData.get("kmEntrada")),
    relatoCliente: formData.get("relatoCliente"),
    diagnostico: formData.get("diagnostico"),
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

export function parseWorkOrderItemFormData(formData: FormData) {
  const unitPriceCents = parseReaisInput(String(formData.get("unitPrice") ?? ""));
  return workOrderItemSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unitPriceCents: unitPriceCents ?? undefined,
  });
}
