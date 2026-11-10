import { describe, expect, it } from "vitest";
import { parseWorkOrderItemsPayload } from "../validation";

const item = { type: "peca", label: "Óleo 5W30", quantity: 2, unitPriceCents: 3500 };

describe("parseWorkOrderItemsPayload", () => {
  it("campo ausente ou vazio = sem itens", () => {
    expect(parseWorkOrderItemsPayload(null)).toEqual({ success: true, data: [] });
    expect(parseWorkOrderItemsPayload("")).toEqual({ success: true, data: [] });
    expect(parseWorkOrderItemsPayload("[]")).toEqual({ success: true, data: [] });
  });

  it("converte cada item para o formato da OS (label vira descrição)", () => {
    const result = parseWorkOrderItemsPayload(JSON.stringify([item]));
    expect(result).toEqual({
      success: true,
      data: [{ type: "peca", description: "Óleo 5W30", quantity: 2, unitPriceCents: 3500 }],
    });
  });

  it("recusa JSON quebrado", () => {
    const result = parseWorkOrderItemsPayload("{não é json");
    expect(result.success).toBe(false);
  });

  it("recusa item inválido dizendo qual é (quantidade zero, tipo desconhecido, sem nome)", () => {
    const zero = parseWorkOrderItemsPayload(JSON.stringify([{ ...item, quantity: 0 }]));
    expect(zero.success).toBe(false);
    if (!zero.success) expect(zero.error).toContain("Óleo 5W30");

    expect(parseWorkOrderItemsPayload(JSON.stringify([{ ...item, type: "outro" }])).success).toBe(
      false,
    );
    expect(parseWorkOrderItemsPayload(JSON.stringify([{ ...item, label: "  " }])).success).toBe(
      false,
    );
    expect(
      parseWorkOrderItemsPayload(JSON.stringify([{ ...item, unitPriceCents: -1 }])).success,
    ).toBe(false);
  });

  it("limita a 100 itens e recusa o que não for lista", () => {
    const many = Array.from({ length: 101 }, () => item);
    expect(parseWorkOrderItemsPayload(JSON.stringify(many)).success).toBe(false);
    expect(parseWorkOrderItemsPayload(JSON.stringify({ a: 1 })).success).toBe(false);
  });
});
