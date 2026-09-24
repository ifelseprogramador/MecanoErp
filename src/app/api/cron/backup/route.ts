import { NextRequest } from "next/server";
import { requireEnv } from "@/core/env";
import { logger } from "@/core/logger";
import { buildOrgBackup, listOrgsWithAutoBackupEnabled, saveAutomaticBackup } from "@/core/backup";

/**
 * Backup automático diário — disparado pelo Vercel Cron (`vercel.json`,
 * `0 6 * * *` = 06h UTC = 03h em Brasília). Protegido por `CRON_SECRET`: o Vercel Cron manda
 * automaticamente `Authorization: Bearer <CRON_SECRET>` quando essa
 * variável existe no projeto — sem ela configurada, esta rota bloqueia
 * qualquer chamada (nunca roda "aberta"). Ver docs/decisoes.md.
 *
 * Roda sequencialmente (não `Promise.all`) de propósito: uma organização
 * com muitos dados não deve competir por conexão de banco com as outras
 * ao mesmo tempo, e se uma falhar, loga e segue pras próximas em vez de
 * derrubar o backup de todo mundo (`Promise.all` rejeitaria no primeiro
 * erro).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${requireEnv("CRON_SECRET")}`) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const orgs = await listOrgsWithAutoBackupEnabled();
  let succeeded = 0;
  let failed = 0;

  for (const org of orgs) {
    try {
      const backup = await buildOrgBackup(org.id, org.name);
      await saveAutomaticBackup(org.id, backup);
      succeeded++;
    } catch (err) {
      failed++;
      logger.error("cron.backup.falhou", { organizationId: org.id, err });
    }
  }

  logger.info("cron.backup.concluido", { total: orgs.length, succeeded, failed });
  return Response.json({ total: orgs.length, succeeded, failed });
}
