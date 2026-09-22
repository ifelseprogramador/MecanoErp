import { describe, expect, it } from "vitest";
import { customerSchema } from "@/modules/clientes/validation";

describe("customerSchema", () => {
  it("aceita um cliente PF válido com campos opcionais vazios", () => {
    const result = customerSchema.safeParse({
      type: "pf",
      name: "Maria Silva",
      document: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("aceita um cliente PJ válido com CNPJ", () => {
    const result = customerSchema.safeParse({
      type: "pj",
      name: "Oficina do João Ltda",
      document: "11.222.333/0001-81",
      email: "contato@oficina.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    const result = customerSchema.safeParse({ type: "pf", name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejeita documento com formato válido mas dígito verificador inválido", () => {
    const result = customerSchema.safeParse({
      type: "pf",
      name: "Maria Silva",
      document: "123.456.789-00",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail malformado", () => {
    const result = customerSchema.safeParse({
      type: "pf",
      name: "Maria Silva",
      email: "não-é-email",
    });
    expect(result.success).toBe(false);
  });
});
