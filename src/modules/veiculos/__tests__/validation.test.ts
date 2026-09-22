import { describe, expect, it } from "vitest";
import { vehicleSchema } from "@/modules/veiculos/validation";

const validCustomerId = "9f6f9b1a-6f2a-4e3a-8b1a-6f2a4e3a8b1a";

describe("vehicleSchema", () => {
  it("aceita um veículo válido e normaliza a placa", () => {
    const result = vehicleSchema.safeParse({
      customerId: validCustomerId,
      plate: "abc-1234",
      brand: "Fiat",
      model: "Uno",
      year: "2015",
      currentKm: "45000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plate).toBe("ABC1234");
      expect(result.data.year).toBe(2015);
    }
  });

  it("rejeita placa inválida", () => {
    const result = vehicleSchema.safeParse({ customerId: validCustomerId, plate: "123456" });
    expect(result.success).toBe(false);
  });

  it("rejeita cliente ausente/inválido", () => {
    const result = vehicleSchema.safeParse({ customerId: "não-é-uuid", plate: "ABC1234" });
    expect(result.success).toBe(false);
  });

  it("rejeita ano fora de uma faixa razoável", () => {
    const result = vehicleSchema.safeParse({
      customerId: validCustomerId,
      plate: "ABC1234",
      year: "1900",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quilometragem negativa", () => {
    const result = vehicleSchema.safeParse({
      customerId: validCustomerId,
      plate: "ABC1234",
      currentKm: "-10",
    });
    expect(result.success).toBe(false);
  });
});
