import { describe, expect, it } from "vitest";
import { formatPlate, isValidPlate, normalizePlate } from "@/core/format";

describe("placa de veículo", () => {
  it("normaliza para maiúscula sem separador", () => {
    expect(normalizePlate("abc-1234")).toBe("ABC1234");
    expect(normalizePlate("abc1d23")).toBe("ABC1D23");
  });

  it("valida placa padrão antigo (ABC1234) e Mercosul (ABC1D23)", () => {
    expect(isValidPlate("ABC-1234")).toBe(true);
    expect(isValidPlate("abc1d23")).toBe(true);
    expect(isValidPlate("ABC123")).toBe(false);
    expect(isValidPlate("1234ABC")).toBe(false);
  });

  it("formata com o separador visual", () => {
    expect(formatPlate("ABC1234")).toBe("ABC-1234");
    expect(formatPlate("abc1d23")).toBe("ABC-1D23");
  });
});
