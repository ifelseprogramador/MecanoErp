import { z } from "zod";
import { isValidDocument } from "@/core/document";

/**
 * Contrato de entrada único para o form (react-hook-form) e a Server
 * Action — nunca confie só na validação do cliente, ver "Padrões de
 * código" no plano.
 */
export const customerSchema = z.object({
  type: z.enum(["pf", "pj"]),
  name: z.string().trim().min(2, "Informe o nome completo."),
  document: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || isValidDocument(v), "CPF/CNPJ inválido."),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido."),
  address: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export function parseCustomerFormData(formData: FormData) {
  return customerSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    document: formData.get("document"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });
}
