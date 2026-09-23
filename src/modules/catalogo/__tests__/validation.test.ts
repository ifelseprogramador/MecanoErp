import { describe, expect, it } from "vitest";
import { catalogItemSchema } from "@/modules/catalogo/validation";

describe("catalogItemSchema", () => {
  it("aceita um item válido", () => {
    const result = catalogItemSchema.safeParse({
      type: "servico",
      name: "Troca de óleo",
      unit: "un",
      defaultPriceCents: 15000,
    });
    expect(result.success).toBe(true);
  });

  it("usa 'un' como unidade padrão quando ausente", () => {
    const result = catalogItemSchema.safeParse({
      type: "peca",
      name: "Filtro de óleo",
      defaultPriceCents: 3000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("un");
    }
  });

  it("rejeita nome vazio", () => {
    const result = catalogItemSchema.safeParse({
      type: "servico",
      name: "  ",
      defaultPriceCents: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita preço negativo", () => {
    const result = catalogItemSchema.safeParse({
      type: "servico",
      name: "Alinhamento",
      defaultPriceCents: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita tipo fora do enum", () => {
    const result = catalogItemSchema.safeParse({
      type: "outro",
      name: "X",
      defaultPriceCents: 100,
    });
    expect(result.success).toBe(false);
  });
});
