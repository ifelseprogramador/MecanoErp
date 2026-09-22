import { describe, expect, it } from "vitest";
import { applyDiscount, formatCents, multiplyCents, sumCents, toCents } from "@/core/money";

describe("money", () => {
  it("converte reais para centavos sem erro de ponto flutuante", () => {
    expect(toCents(150.9)).toBe(15090);
    expect(toCents(0.1)).toBe(10);
    expect(toCents(10)).toBe(1000);
  });

  it("formata centavos como moeda brasileira", () => {
    expect(formatCents(15090)).toBe("R$ 150,90");
    expect(formatCents(0)).toBe("R$ 0,00");
  });

  it("soma uma lista de valores em centavos", () => {
    expect(sumCents([1000, 2050, 950])).toBe(4000);
    expect(sumCents([])).toBe(0);
  });

  it("multiplica valor unitário por quantidade e arredonda", () => {
    expect(multiplyCents(333, 3)).toBe(999);
    expect(multiplyCents(1050, 1.5)).toBe(1575);
  });

  it("aplica desconto sem deixar o total negativo", () => {
    expect(applyDiscount(10000, 3000)).toBe(7000);
    expect(applyDiscount(10000, 15000)).toBe(0);
    expect(applyDiscount(10000, 0)).toBe(10000);
  });
});
