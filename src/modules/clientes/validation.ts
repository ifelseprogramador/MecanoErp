import { z } from "zod";
import { isValidDocument } from "@/core/document";
import { isValidCep, isValidIbge, isValidIe, isValidUf, onlyDigits } from "@/core/fiscal-fields";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

/**
 * Contrato de entrada único para o form e a Server Action — nunca confie só
 * na validação do cliente. Campos fiscais/endereço são opcionais no
 * cadastro; o que a nota fiscal exige é checado na hora de emitir.
 */
export const customerSchema = z
  .object({
    type: z.enum(["pf", "pj"]),
    name: z.string().trim().min(2, "Informe o nome completo."),
    legalName: optionalText,
    tradeName: optionalText,
    document: optionalText.refine((v) => !v || isValidDocument(v), "CPF/CNPJ inválido."),
    ieIndicator: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["contribuinte", "isento", "nao_contribuinte"]).default("nao_contribuinte"),
    ),
    ie: optionalText,
    im: optionalText,
    phone: optionalText,
    email: optionalText.refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido."),
    zip: optionalText.refine((v) => !v || isValidCep(v), "CEP deve ter 8 dígitos."),
    street: optionalText,
    number: optionalText,
    complement: optionalText,
    district: optionalText,
    city: optionalText,
    state: optionalText.refine((v) => !v || isValidUf(v), "UF inválida."),
    ibgeCode: optionalText.refine((v) => !v || isValidIbge(v), "Código IBGE deve ter 7 dígitos."),
    notes: optionalText,
  })
  .superRefine((v, ctx) => {
    if (v.ieIndicator === "contribuinte" && !v.ie) {
      ctx.addIssue({ code: "custom", path: ["ie"], message: "Informe a Inscrição Estadual." });
    }
    if (v.ie && v.ieIndicator === "contribuinte" && !isValidIe(v.ie)) {
      ctx.addIssue({ code: "custom", path: ["ie"], message: "Inscrição Estadual inválida." });
    }
  });

export type CustomerInput = z.infer<typeof customerSchema>;

export const CUSTOMER_FIELDS = [
  "type",
  "name",
  "legalName",
  "tradeName",
  "document",
  "ieIndicator",
  "ie",
  "im",
  "phone",
  "email",
  "zip",
  "street",
  "number",
  "complement",
  "district",
  "city",
  "state",
  "ibgeCode",
  "notes",
] as const;

export function parseCustomerFormData(formData: FormData) {
  return customerSchema.safeParse(
    Object.fromEntries(
      CUSTOMER_FIELDS.map((f) => {
        const v = formData.get(f);
        return [f, v === null || v === "" ? undefined : v];
      }),
    ),
  );
}

/** Separa o input plano em colunas de `customers` e do endereço principal.
 * Aceita registros offline antigos (sem os campos fiscais). */
export function splitCustomerInput(input: CustomerInput) {
  const { zip, street, number, complement, district, city, state, ibgeCode, ...rest } = input;
  const customer = {
    ...rest,
    document: input.document ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    legalName: input.legalName ?? null,
    tradeName: input.tradeName ?? null,
    im: input.im ?? null,
    // IE só faz sentido para contribuinte.
    ie: input.ieIndicator === "contribuinte" ? (input.ie ?? null) : null,
  };
  const hasAddress = [zip, street, number, complement, district, city, state, ibgeCode].some(
    Boolean,
  );
  return {
    customer,
    address: hasAddress
      ? {
          zip: zip ? onlyDigits(zip) : null,
          street: street ?? null,
          number: number ?? null,
          complement: complement ?? null,
          district: district ?? null,
          city: city ?? null,
          state: state ? state.toUpperCase() : null,
          ibgeCode: ibgeCode ?? null,
        }
      : null,
  };
}
