import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { APP_VERSION, CHANGELOG } from "@/core/changelog";

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

describe("changelog", () => {
  it("package.json#version bate com a versão mais recente do changelog", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toBe(APP_VERSION);
  });

  it("versões são semver, únicas e em ordem decrescente (mais nova no topo)", () => {
    const versions = CHANGELOG.map((e) => e.version);
    for (const v of versions) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    expect(new Set(versions).size).toBe(versions.length);
    for (let i = 1; i < versions.length; i++) {
      expect(compareSemver(versions[i - 1], versions[i])).toBeGreaterThan(0);
    }
  });

  it("toda versão tem data AAAA-MM-DD e pelo menos uma mudança", () => {
    for (const entry of CHANGELOG) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.changes.length).toBeGreaterThan(0);
    }
  });
});
