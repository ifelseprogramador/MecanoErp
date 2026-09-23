import { z } from "zod";
import { parseReaisInput } from "@/core/money";

export const catalogItemSchema = z.object({
  type: z.enum(["servico", "peca"]),
  name: z.string().trim().min(1, "Informe o nome."),
  unit: z.string().trim().min(1, "Informe a unidade.").default("un"),
  defaultPriceCents: z.coerce.number().int().min(0),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

export function parseCatalogItemFormData(formData: FormData) {
  const priceCents = parseReaisInput(String(formData.get("defaultPrice") ?? ""));
  return catalogItemSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    unit: formData.get("unit") || "un",
    defaultPriceCents: priceCents ?? undefined,
  });
}
