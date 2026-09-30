import { describe, expect, it } from "vitest";
import { customerSchema, splitCustomerInput } from "@/modules/clientes/validation";

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

  describe("campos fiscais", () => {
    const base = { type: "pf" as const, name: "Maria Silva" };

    it("exige IE quando contribuinte", () => {
      const r = customerSchema.safeParse({ ...base, ieIndicator: "contribuinte" });
      expect(r.success).toBe(false);
    });

    it("aceita CSV com ieIndicator vazio (vira não contribuinte)", () => {
      const r = customerSchema.parse({ ...base, ieIndicator: "", zip: "", state: "" });
      expect(r.ieIndicator).toBe("nao_contribuinte");
    });

    it("valida CEP, UF e IBGE", () => {
      const r = customerSchema.safeParse({ ...base, zip: "12", state: "XX", ibgeCode: "1" });
      expect(Object.keys(r.error?.flatten().fieldErrors ?? {}).sort()).toEqual([
        "ibgeCode",
        "state",
        "zip",
      ]);
    });

    it("separa o endereço e descarta IE de não contribuinte", () => {
      const { customer, address } = splitCustomerInput(
        customerSchema.parse({ ...base, ie: "123", zip: "01310-100", state: "sp" }),
      );
      expect(customer.ie).toBeNull();
      expect(address).toMatchObject({ zip: "01310100", state: "SP" });
    });

    it("sem campos de endereço não cria endereço", () => {
      expect(splitCustomerInput(customerSchema.parse(base)).address).toBeNull();
    });
  });
});
