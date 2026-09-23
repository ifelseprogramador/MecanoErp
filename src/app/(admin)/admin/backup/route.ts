import { requireAdmin } from "@/core/admin-auth";
import { buildSystemBackup } from "@/core/backup";

/**
 * Backup de TODAS as oficinas da plataforma — só o dono (`/admin`) tem
 * acesso. Cada organização vem isolada dentro de `organizations[]`, no
 * MESMO formato que `GET /backup/exportar` gera pra uma oficina — dá
 * pra restaurar uma organização específica daqui com
 * `core/backup.ts#restoreOrgBackup`, mas o arquivo inteiro não tem
 * restauração automática de sistema (ver comentário em
 * `buildSystemBackup`).
 */
export async function GET() {
  const { log } = await requireAdmin();
  log.info("admin.backup.exportar");

  const backup = await buildSystemBackup();
  const filename = `mecanoerp-backup-sistema-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
