import "@/core/load-modules"; // Sem o layout (Route Handler / Server Action), é isto que registra as tabelas de cada módulo em `registerBackupTable` — sem isso o backup sai VAZIO.
import { ModuleAccessDeniedError, getActiveOrg, requireOwner } from "@/core/auth";
import { buildOrgBackup, markBackupDownloaded } from "@/core/backup";

/**
 * Backup completo da organização em JSON — estrutura (colunas + tipos,
 * lidos direto do schema Drizzle) e dados de TODAS as tabelas de
 * negócio, pra não perder nada numa pane e servir de ponto de partida
 * pra migrar pra outro banco. Ver `core/backup.ts` pro formato completo
 * e `POST /backup/restaurar` pra reimportar este mesmo arquivo.
 */
export async function GET() {
  const access = await Promise.all([requireOwner(), getActiveOrg()]).catch((err) =>
    err instanceof ModuleAccessDeniedError ? null : Promise.reject(err),
  );
  if (!access) return new Response("Acesso negado.", { status: 403 });
  const [{ withDb, log }, org] = access;
  log.info("backup.exportar");

  const backup = await withDb(async (tx) => {
    const built = await buildOrgBackup(tx, org.organizationId, org.organizationName);
    // Zera o lembrete — mas não quando é o dono da plataforma no modo suporte: o
    // backup que ele baixa não é o do responsável da oficina.
    if (!org.impersonating) await markBackupDownloaded(tx, org.organizationId);
    return built;
  });
  const filename = `mecanoerp-backup-${org.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
