import "server-only";
import { eq } from "drizzle-orm";
import { runWithUserContext } from "@/core/db";
import { organizationModuleSettings } from "@/db/schema";
import { getAllModules, type ModuleDefinition } from "@/core/registry";

/**
 * Módulos habilitados para UMA organização específica: parte do padrão
 * global de cada `module.ts` (`enabled`), com override por linha em
 * `organization_module_settings` quando o admin personalizou algo para
 * aquela oficina (ver `core/admin/actions.ts#setModuleEnabledForOrg`).
 *
 * Recebe `userId` (não vem de `withOrg()` — chamado direto do layout,
 * antes de qualquer módulo de negócio) só pra abrir a própria transação
 * com RLS ativa (`runWithUserContext`); a policy de
 * `organization_module_settings` (via `apply_org_rls`) já libera a
 * própria organização normalmente.
 */
export async function getEnabledModulesForOrg(
  userId: string,
  organizationId: string,
): Promise<ModuleDefinition[]> {
  const overrides = await runWithUserContext(userId, (tx) =>
    tx
      .select({
        moduleSlug: organizationModuleSettings.moduleSlug,
        enabled: organizationModuleSettings.enabled,
      })
      .from(organizationModuleSettings)
      .where(eq(organizationModuleSettings.organizationId, organizationId)),
  );

  const overrideBySlug = new Map(overrides.map((o) => [o.moduleSlug, o.enabled]));

  return getAllModules()
    .filter((m) => overrideBySlug.get(m.slug) ?? m.enabled)
    .sort((a, b) => a.order - b.order);
}
