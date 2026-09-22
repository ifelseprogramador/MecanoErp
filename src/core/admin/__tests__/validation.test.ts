import { describe, expect, it } from "vitest";
import { billingSchema, newOrganizationSchema } from "@/core/admin/validation";

describe("billingSchema", () => {
  it("aceita status válido sem data/observação", () => {
    const result = billingSchema.safeParse({ billingStatus: "em_dia" });
    expect(result.success).toBe(true);
  });

  it("rejeita status inválido", () => {
    const result = billingSchema.safeParse({ billingStatus: "quitado" });
    expect(result.success).toBe(false);
  });
});

describe("newOrganizationSchema", () => {
  it("aceita dados válidos", () => {
    const result = newOrganizationSchema.safeParse({
      organizationName: "Oficina do João",
      ownerEmail: "joao@example.com",
      ownerPassword: "senha123",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita senha curta", () => {
    const result = newOrganizationSchema.safeParse({
      organizationName: "Oficina do João",
      ownerEmail: "joao@example.com",
      ownerPassword: "123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const result = newOrganizationSchema.safeParse({
      organizationName: "Oficina do João",
      ownerEmail: "não-é-email",
      ownerPassword: "senha123",
    });
    expect(result.success).toBe(false);
  });
});
