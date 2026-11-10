import { describe, expect, it } from "vitest";
import { workOrderHeaderSchema, workOrderItemSchema } from "@/modules/ordens/validation";

const uuid = "9f6f9b1a-6f2a-4e3a-8b1a-6f2a4e3a8b1a";

describe("workOrderHeaderSchema", () => {
  it("aceita um cabeçalho válido", () => {
    const result = workOrderHeaderSchema.safeParse({
      customerId: uuid,
      vehicleId: uuid,
      kmEntrada: "45000",
      discountCents: 1000,
    });
    expect(result.success).toBe(true);
  });

  it("desconto padrão é zero quando ausente", () => {
    const result = workOrderHeaderSchema.safeParse({ customerId: uuid, vehicleId: uuid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discountCents).toBe(0);
    }
  });

  it("rejeita cliente ou veículo ausente", () => {
    expect(workOrderHeaderSchema.safeParse({ vehicleId: uuid }).success).toBe(false);
    expect(workOrderHeaderSchema.safeParse({ customerId: uuid }).success).toBe(false);
  });

  it("rejeita desconto negativo", () => {
    const result = workOrderHeaderSchema.safeParse({
      customerId: uuid,
      vehicleId: uuid,
      discountCents: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("workOrderItemSchema", () => {
  it("aceita um item válido", () => {
    const result = workOrderItemSchema.safeParse({
      type: "servico",
      description: "Troca de óleo",
      quantity: 1,
      unitPriceCents: 15000,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quantidade zero ou negativa", () => {
    expect(
      workOrderItemSchema.safeParse({
        type: "peca",
        description: "Filtro",
        quantity: 0,
        unitPriceCents: 1000,
      }).success,
    ).toBe(false);
    expect(
      workOrderItemSchema.safeParse({
        type: "peca",
        description: "Filtro",
        quantity: -1,
        unitPriceCents: 1000,
      }).success,
    ).toBe(false);
  });

  it("rejeita descrição vazia", () => {
    const result = workOrderItemSchema.safeParse({
      type: "servico",
      description: "  ",
      quantity: 1,
      unitPriceCents: 1000,
    });
    expect(result.success).toBe(false);
  });
});

describe("parseWorkOrderHeaderFormData com campos ausentes (assistente do modo Fácil)", () => {
  it("aceita só cliente + veículo: relato, diagnóstico, km e desconto são opcionais", async () => {
    const { parseWorkOrderHeaderFormData } = await import("../validation");
    const formData = new FormData();
    formData.set("customerId", "3f2b1c4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b");
    formData.set("vehicleId", "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d");
    // relatoCliente, diagnostico, kmEntrada e discount NÃO foram enviados.

    const result = parseWorkOrderHeaderFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.relatoCliente).toBeUndefined();
      expect(result.data.diagnostico).toBeUndefined();
      expect(result.data.kmEntrada).toBeUndefined();
      expect(result.data.discountCents).toBe(0);
    }
  });
});
