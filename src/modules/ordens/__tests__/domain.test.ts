import { describe, expect, it } from "vitest";
import {
  calculateItemTotal,
  calculateOrderTotal,
  isTerminalStatus,
  isValidTransition,
} from "@/modules/ordens/domain";

describe("isValidTransition", () => {
  it("permite o fluxo feliz completo", () => {
    expect(isValidTransition("orcamento", "aprovada")).toBe(true);
    expect(isValidTransition("aprovada", "em_andamento")).toBe(true);
    expect(isValidTransition("em_andamento", "concluida")).toBe(true);
    expect(isValidTransition("concluida", "entregue")).toBe(true);
  });

  it("permite cancelar de orcamento, aprovada ou em_andamento", () => {
    expect(isValidTransition("orcamento", "cancelada")).toBe(true);
    expect(isValidTransition("aprovada", "cancelada")).toBe(true);
    expect(isValidTransition("em_andamento", "cancelada")).toBe(true);
  });

  it("rejeita pular etapas", () => {
    expect(isValidTransition("orcamento", "concluida")).toBe(false);
    expect(isValidTransition("orcamento", "em_andamento")).toBe(false);
    expect(isValidTransition("aprovada", "entregue")).toBe(false);
  });

  it("rejeita transição a partir de um estado terminal", () => {
    expect(isValidTransition("entregue", "orcamento")).toBe(false);
    expect(isValidTransition("cancelada", "aprovada")).toBe(false);
  });

  it("rejeita cancelar depois de concluída ou entregue", () => {
    expect(isValidTransition("concluida", "cancelada")).toBe(false);
    expect(isValidTransition("entregue", "cancelada")).toBe(false);
  });
});

describe("isTerminalStatus", () => {
  it("entregue e cancelada são terminais", () => {
    expect(isTerminalStatus("entregue")).toBe(true);
    expect(isTerminalStatus("cancelada")).toBe(true);
  });

  it("os demais não são terminais", () => {
    expect(isTerminalStatus("orcamento")).toBe(false);
    expect(isTerminalStatus("aprovada")).toBe(false);
    expect(isTerminalStatus("em_andamento")).toBe(false);
    expect(isTerminalStatus("concluida")).toBe(false);
  });
});

describe("calculateItemTotal", () => {
  it("multiplica valor unitário por quantidade e arredonda", () => {
    expect(calculateItemTotal({ quantity: 2, unitPriceCents: 5000 })).toBe(10000);
    expect(calculateItemTotal({ quantity: 1.5, unitPriceCents: 1000 })).toBe(1500);
  });
});

describe("calculateOrderTotal", () => {
  it("soma os itens e aplica o desconto", () => {
    const items = [
      { quantity: 1, unitPriceCents: 10000 },
      { quantity: 2, unitPriceCents: 2500 },
    ];
    expect(calculateOrderTotal(items, 0)).toBe(15000);
    expect(calculateOrderTotal(items, 5000)).toBe(10000);
  });

  it("não deixa o total negativo com desconto maior que o subtotal", () => {
    const items = [{ quantity: 1, unitPriceCents: 1000 }];
    expect(calculateOrderTotal(items, 5000)).toBe(0);
  });

  it("uma OS sem itens tem total zero", () => {
    expect(calculateOrderTotal([], 0)).toBe(0);
  });
});
