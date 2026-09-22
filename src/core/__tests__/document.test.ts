import { describe, expect, it } from "vitest";
import { formatDocument, isValidCnpj, isValidCpf, isValidDocument } from "@/core/document";

describe("document", () => {
  it("valida CPFs corretos e rejeita inválidos", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false); // todos dígitos iguais
    expect(isValidCpf("123.456.789-00")).toBe(false); // dígito verificador errado
    expect(isValidCpf("123")).toBe(false); // tamanho errado
  });

  it("valida CNPJs corretos e rejeita inválidos", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("11.111.111/1111-11")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-00")).toBe(false);
  });

  it("isValidDocument distingue CPF de CNPJ pelo tamanho", () => {
    expect(isValidDocument("529.982.247-25")).toBe(true);
    expect(isValidDocument("11.222.333/0001-81")).toBe(true);
    expect(isValidDocument("123")).toBe(false);
  });

  it("formata CPF e CNPJ", () => {
    expect(formatDocument("52998224725")).toBe("529.982.247-25");
    expect(formatDocument("11222333000181")).toBe("11.222.333/0001-81");
  });
});
