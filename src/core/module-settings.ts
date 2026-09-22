import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizationModuleSettings } from "@/db/schema";
import { getAllModules, type ModuleDefinition } from "@/core/registry";

/**
 * Módulos habilitados para UMA organização específica: parte do padrão
 * global de cada `module.ts` (`enabled`), com override por linha em
 * `organization_module_settings` quando o admin personalizou algo para
 * aquela oficina (ver `core/admin/actions.ts#setModuleEnabledForOrg`).
 */
export async function getEnabledModulesForOrg(organizationId: string): Promise<ModuleDefinition[]> {
  const overrides = await db
    .select({
      moduleSlug: organizationModuleSettings.moduleSlug,
      enabled: organizationModuleSettings.enabled,
    })
    .from(organizationModuleSettings)
    .where(eq(organizationModuleSettings.organizationId, organizationId));

  const overrideBySlug = new Map(overrides.map((o) => [o.moduleSlug, o.enabled]));

  return getAllModules()
    .filter((m) => overrideBySlug.get(m.slug) ?? m.enabled)
    .sort((a, b) => a.order - b.order);
}
