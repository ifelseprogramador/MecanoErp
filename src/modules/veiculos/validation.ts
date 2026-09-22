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

function emptyToUndefined(value: FormDataEntryValue | null) {
  return value === "" ? undefined : value;
}

export function parseVehicleFormData(formData: FormData) {
  return vehicleSchema.safeParse({
    customerId: formData.get("customerId"),
    plate: formData.get("plate"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    year: emptyToUndefined(formData.get("year")),
    color: formData.get("color"),
    fuel: emptyToUndefined(formData.get("fuel")),
    chassis: formData.get("chassis"),
    currentKm: emptyToUndefined(formData.get("currentKm")),
  });
}
