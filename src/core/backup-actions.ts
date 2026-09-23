"use server";

import { revalidatePath } from "next/cache";
import { withOrg } from "@/core/auth";
import {
  restoreOrgBackup,
  setAutoBackupEnabled,
  type BackupFile,
  type RestoreSummary,
} from "@/core/backup";
import type { ActionResult } from "@/core/action-result";

export type BackupRestoreState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; summary: RestoreSummary[] };

function isBackupFile(value: unknown): value is BackupFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    "scope" in value &&
    (value as { scope?: unknown }).scope === "organization" &&
    "tables" in value &&
    typeof (value as { tables?: unknown }).tables === "object"
  );
}

/**
 * Restaura um backup (`GET /backup/exportar`) — sempre dentro da
 * organização de quem está chamando, nunca da que estiver gravada no
 * arquivo (ver `core/backup.ts#restoreOrgBackup`). Idempotente: rodar
 * duas vezes, ou restaurar em cima de dados que já existem, não duplica
 * nem quebra nada — só preenche o que faltar.
 */
export async function restoreBackup(
  _prevState: BackupRestoreState,
  formData: FormData,
): Promise<BackupRestoreState> {
  const { organizationId, log } = await withOrg();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecione um arquivo de backup (.json)." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { status: "error", message: "Arquivo inválido — não é um JSON válido." };
  }

  if (!isBackupFile(parsed)) {
    return {
      status: "error",
      message: "Este arquivo não parece ser um backup do MecanoErp (formato não reconhecido).",
    };
  }

  log.info("backup.restaurar", { sourceOrganizationId: parsed.organizationId });
  const summary = await restoreOrgBackup(organizationId, parsed);
  log.info("backup.restaurar.sucesso", {
    totals: Object.fromEntries(summary.map((s) => [s.table, s.inserted])),
  });

  return { status: "done", summary };
}

export async function toggleAutoBackup(enabled: boolean): Promise<ActionResult> {
  const { organizationId, log } = await withOrg();
  await setAutoBackupEnabled(organizationId, enabled);
  log.info("backup.automatico.alternar", { enabled });
  revalidatePath("/backup");
  return { ok: true };
}
