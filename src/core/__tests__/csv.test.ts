import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/core/csv";

describe("csv", () => {
  it("faz ida e volta (export -> import) preservando os valores", () => {
    const rows = [
      { nome: "João", cidade: "São Paulo" },
      { nome: "Maria, do Carmo", cidade: 'Rio "Grande"' },
    ];
    const csv = toCsv(rows, ["nome", "cidade"]);
    const parsed = parseCsv(csv);
    expect(parsed).toEqual(rows);
  });

  it("escapa campo com vírgula, aspas e quebra de linha", () => {
    const csv = toCsv([{ obs: 'linha1\nlinha2, com "aspas"' }], ["obs"]);
    const [row] = parseCsv(csv);
    expect(row.obs).toBe('linha1\nlinha2, com "aspas"');
  });

  it("ignora BOM UTF-8 na leitura", () => {
    const csv = "﻿nome\nJoão";
    expect(parseCsv(csv)).toEqual([{ nome: "João" }]);
  });

  it("string vazia vira lista vazia", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("só cabeçalho (sem linhas de dado) vira lista vazia", () => {
    expect(parseCsv("nome,cidade\n")).toEqual([]);
  });
});
