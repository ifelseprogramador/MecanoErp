import { describe, expect, it } from "vitest";
import { parseVehicleFormData, vehicleSchema } from "@/modules/veiculos/validation";

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

describe("parseVehicleFormData com campos ausentes (cadastro rápido do modo Fácil)", () => {
  const CUSTOMER_ID = "3f2b1c4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b";

  it("aceita só cliente + placa (+ marca/modelo): ano, cor, combustível, km e chassi são opcionais", () => {
    const formData = new FormData();
    formData.set("customerId", CUSTOMER_ID);
    formData.set("plate", "ABC1D23");
    formData.set("brand", "Fiat");
    formData.set("model", "Uno");
    // year, color, fuel, chassis e currentKm NÃO foram enviados (FormData.get → null).

    const result = parseVehicleFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plate).toBe("ABC1D23");
      expect(result.data.year).toBeUndefined();
      expect(result.data.fuel).toBeUndefined();
      expect(result.data.currentKm).toBeUndefined();
    }
  });
});

describe("cadastro rápido com os opcionais (Mais dados)", () => {
  const CUSTOMER_ID = "3f2b1c4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b";

  function quick(extra: Record<string, string>) {
    const formData = new FormData();
    formData.set("customerId", CUSTOMER_ID);
    formData.set("plate", "ABC1D23");
    formData.set("brand", "");
    formData.set("model", "");
    for (const [key, value] of Object.entries(extra)) formData.set(key, value);
    return parseVehicleFormData(formData);
  }

  it("aceita ano, cor e combustível preenchidos", () => {
    const result = quick({ year: "2019", color: "Prata", fuel: "flex" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2019);
      expect(result.data.color).toBe("Prata");
      expect(result.data.fuel).toBe("flex");
    }
  });

  it("aceita os três vazios (a pessoa abriu 'Mais dados' e não preencheu)", () => {
    expect(quick({ year: "", color: "", fuel: "" }).success).toBe(true);
  });

  it("ano absurdo continua sendo recusado, com mensagem no campo year", () => {
    const result = quick({ year: "1800" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.year).toBeTruthy();
  });
});

describe("cadastro rápido: quilometragem e chassi opcionais", () => {
  it("aceita km e chassi preenchidos ou vazios", () => {
    const base = new FormData();
    base.set("customerId", "3f2b1c4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b");
    base.set("plate", "ABC1D23");
    base.set("currentKm", "85000");
    base.set("chassis", "9BWZZZ377VT004251");
    const full = parseVehicleFormData(base);
    expect(full.success).toBe(true);
    if (full.success) expect(full.data.currentKm).toBe(85000);

    base.set("currentKm", "");
    base.set("chassis", "");
    expect(parseVehicleFormData(base).success).toBe(true);
  });
});
