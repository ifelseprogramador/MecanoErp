import { z } from "zod";
import { isValidPlate, normalizePlate } from "@/core/format";

const currentYear = new Date().getFullYear();

export const vehicleSchema = z.object({
  customerId: z.uuid("Selecione um cliente."),
  plate: z
    .string()
    .trim()
    .min(1, "Informe a placa.")
    .refine(isValidPlate, "Placa inválida.")
    .transform(normalizePlate),
  brand: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  model: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  year: z.coerce
    .number()
    .int()
    .min(1950)
    .max(currentYear + 1)
    .optional(),
  color: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  fuel: z.enum(["gasolina", "etanol", "flex", "diesel", "eletrico", "gnv"]).optional(),
  chassis: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  currentKm: z.coerce.number().int().min(0).optional(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

// `FormData.get` devolve `null` para campo que não foi enviado (ex.: cadastro
// rápido do modo Fácil, que só manda alguns campos). Ausente = vazio = opcional;
// sem isso o `null` chegava ao `z.coerce`/`z.enum` e virava erro num campo que
// a tela nem mostra.
function emptyToUndefined(value: FormDataEntryValue | null) {
  return value === "" || value === null ? undefined : value;
}

export function parseVehicleFormData(formData: FormData) {
  return vehicleSchema.safeParse({
    customerId: formData.get("customerId"),
    plate: formData.get("plate"),
    brand: emptyToUndefined(formData.get("brand")),
    model: emptyToUndefined(formData.get("model")),
    year: emptyToUndefined(formData.get("year")),
    color: emptyToUndefined(formData.get("color")),
    fuel: emptyToUndefined(formData.get("fuel")),
    chassis: emptyToUndefined(formData.get("chassis")),
    currentKm: emptyToUndefined(formData.get("currentKm")),
  });
}
