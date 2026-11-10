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

describe("cadastro rápido do modo Fácil: payload mínimo passa na validação", () => {
  it("item só com tipo, nome e preço (unidade assume 'un')", async () => {
    const { parseCatalogItemFormData } = await import("../validation");
    const formData = new FormData();
    formData.set("type", "peca");
    formData.set("name", "Filtro de óleo");
    formData.set("defaultPrice", "35,00");
    const result = parseCatalogItemFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("un");
      expect(result.data.defaultPriceCents).toBe(3500);
    }
  });
});

describe("cadastro rápido com a unidade opcional (Mais dados)", () => {
  async function quick(unit: string) {
    const { parseCatalogItemFormData } = await import("../validation");
    const formData = new FormData();
    formData.set("type", "servico");
    formData.set("name", "Alinhamento");
    formData.set("defaultPrice", "80,00");
    formData.set("unit", unit);
    return parseCatalogItemFormData(formData);
  }

  it("usa a unidade informada ou 'un' quando fica vazia", async () => {
    const hours = await quick("h");
    expect(hours.success && hours.data.unit).toBe("h");
    const empty = await quick("");
    expect(empty.success && empty.data.unit).toBe("un");
  });
});
