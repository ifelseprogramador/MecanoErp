import { canAccessModule } from "@/core/module-access";
import type { getActiveOrg } from "@/core/auth";
import { getCustomerDashboardSummary } from "@/modules/clientes";
import { getVehicleDashboardSummary } from "@/modules/veiculos";
import { getWorkOrderDashboardSummary } from "@/modules/ordens";

/**
 * Dados do painel — FONTE ÚNICA dos dois layouts (formal: `page.tsx`; Fácil:
 * `inicio-facil.tsx`). Toda métrica nova entra AQUI e deve aparecer nos dois
 * layouts, só com apresentação diferente (regra em docs/decisoes.md). Cada
 * bloco só é consultado se a pessoa tem acesso ao módulo (`requireModule()`
 * nas queries lançaria erro).
 */
export async function loadPainelData(org: Awaited<ReturnType<typeof getActiveOrg>>) {
  const temOrdens = canAccessModule(org.moduleAccess, "ordens");
  const temClientes = canAccessModule(org.moduleAccess, "clientes");
  const temVeiculos = canAccessModule(org.moduleAccess, "veiculos");

  const [customerSummary, vehicleSummary, orderSummary] = await Promise.all([
    temClientes ? getCustomerDashboardSummary() : null,
    temVeiculos ? getVehicleDashboardSummary() : null,
    temOrdens ? getWorkOrderDashboardSummary() : null,
  ]);

  return { temOrdens, temClientes, temVeiculos, customerSummary, vehicleSummary, orderSummary };
}
