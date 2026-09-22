import { test, expect } from "@playwright/test";

// Prova de vida do pipeline de E2E — cresce a partir da Fase 3 do plano
// (fluxo completo cliente -> veículo -> orçamento -> OS -> financeiro).
test("a página inicial carrega", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});
