import "server-only";
import { and, desc, eq, getTableColumns, inArray, type Table } from "drizzle-orm";
import { db } from "./db";
import { customers } from "@/modules/clientes/schema";
import { vehicles } from "@/modules/veiculos/schema";
import { catalogItems } from "@/modules/catalogo/schema";
import { workOrderCounters, workOrderItems, workOrders } from "@/modules/ordens/schema";
import { organizations } from "@/db/schema/tenancy";
import { organizationBackupSettings, organizationBackups } from "@/db/schema/backup";

/** Quantos backups automáticos guardar por organização — o cron
 * (`api/cron/backup/route.ts`) apaga os mais antigos além disso a cada
 * rodada. Uma semana de histórico diário é suficiente pra recuperar de
 * uma pane sem deixar a tabela crescer sem limite. */
export const AUTO_BACKUP_RETENTION = 7;

export const BACKUP_VERSION = 1;

export interface ColumnDescriptor {
  name: string;
  /** Tipo lido direto da definição Drizzle/Postgres real (nunca
   * hardcoded à mão) — serve de referência pra recriar a estrutura numa
   * ferramenta/banco diferente (ex.: MySQL). Enum vem como
   * `enum(valor1|valor2|...)`. */
  sqlType: string;
  notNull: boolean;
}

export interface TableBackup {
  columns: ColumnDescriptor[];
  rows: Record<string, unknown>[];
}

export interface BackupFile {
  version: number;
  exportedAt: string;
  scope: "organization";
  organizationId: string;
  organizationName: string;
  tables: Record<string, TableBackup>;
}

export interface RestoreSummary {
  table: string;
  inserted: number;
  skipped: number;
}

function describeColumns(table: Table): ColumnDescriptor[] {
  const columns = getTableColumns(table);
  return Object.values(columns).map((col) => ({
    name: col.name,
    sqlType: col.enumValues?.length
      ? `enum(${col.enumValues.join("|")})`
      : col.columnType.replace(/^Pg/, "").toLowerCase(),
    notNull: col.notNull,
  }));
}

/** Colunas de data por tabela — precisam virar `Date` de novo ao
 * restaurar (o JSON só guarda a versão ISO string). Listado à mão em vez
 * de inferir pelo nome (mais explícito, sem depender de convenção). */
const DATE_COLUMNS: Record<string, string[]> = {
  customers: ["createdAt", "updatedAt"],
  vehicles: ["createdAt", "updatedAt"],
  catalog_items: ["createdAt", "updatedAt"],
  work_orders: [
    "approvedAt",
    "startedAt",
    "completedAt",
    "deliveredAt",
    "cancelledAt",
    "createdAt",
    "updatedAt",
  ],
  work_order_items: ["createdAt"],
};

function reviveDates(row: Record<string, unknown>, table: string): Record<string, unknown> {
  const dateColumns = DATE_COLUMNS[table];
  if (!dateColumns) return row;
  const revived = { ...row };
  for (const col of dateColumns) {
    if (typeof revived[col] === "string") revived[col] = new Date(revived[col] as string);
  }
  return revived;
}

/**
 * Backup completo dos dados de NEGÓCIO de uma organização — tudo que a
 * oficina cadastrou (clientes, veículos, catálogo, ordens de serviço e
 * seus itens, mais o contador de numeração da OS, pra não perder a
 * sequência numa restauração). Não inclui tabelas de plataforma
 * (`organizations`, `memberships`) — o backup de um dono de oficina é só
 * o que É DELE, não a conta em si.
 */
export async function buildOrgBackup(
  organizationId: string,
  organizationName: string,
): Promise<BackupFile> {
  const [customerRows, vehicleRows, catalogRows, counterRows, orderRows] = await Promise.all([
    db.select().from(customers).where(eq(customers.organizationId, organizationId)),
    db.select().from(vehicles).where(eq(vehicles.organizationId, organizationId)),
    db.select().from(catalogItems).where(eq(catalogItems.organizationId, organizationId)),
    db.select().from(workOrderCounters).where(eq(workOrderCounters.organizationId, organizationId)),
    db.select().from(workOrders).where(eq(workOrders.organizationId, organizationId)),
  ]);

  // `work_order_items` não tem `organization_id` próprio — filtra pelos
  // ids das OSs já buscadas acima (mesmo motivo documentado em
  // modules/ordens/queries.ts#listWorkOrderItems).
  const orderIds = orderRows.map((o) => o.id);
  const itemRows = orderIds.length
    ? await db.select().from(workOrderItems).where(inArray(workOrderItems.workOrderId, orderIds))
    : [];

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    scope: "organization",
    organizationId,
    organizationName,
    tables: {
      customers: { columns: describeColumns(customers), rows: customerRows },
      vehicles: { columns: describeColumns(vehicles), rows: vehicleRows },
      catalog_items: { columns: describeColumns(catalogItems), rows: catalogRows },
      work_order_counters: { columns: describeColumns(workOrderCounters), rows: counterRows },
      work_orders: { columns: describeColumns(workOrders), rows: orderRows },
      work_order_items: { columns: describeColumns(workOrderItems), rows: itemRows },
    },
  };
}

/**
 * Restaura um backup DENTRO da organização de quem está chamando —
 * `organizationId` nunca vem do arquivo (poderia ter sido gerado por
 * outra organização, ou editado à mão): todo campo `organizationId` de
 * cada linha é sobrescrito com o da sessão atual antes de inserir, e
 * `work_order_counters`/`work_orders` que não sejam desta organização
 * são ignorados mesmo que estivessem no arquivo.
 *
 * Idempotente por design (`onConflictDoNothing`, chaveado pelo `id` já
 * presente nas linhas): rodar a restauração duas vezes, ou restaurar por
 * cima de dados que já existem (recuperação parcial), nunca duplica nem
 * quebra — só preenche o que ainda não existe. Ordem de inserção
 * respeita as FKs (cliente → veículo → catálogo → contador → OS → item
 * da OS).
 */
export async function restoreOrgBackup(
  organizationId: string,
  backup: BackupFile,
): Promise<RestoreSummary[]> {
  const summary: RestoreSummary[] = [];

  async function restoreTable<T extends Record<string, unknown>>(
    key: string,
    table: Table,
    stampOrg: (row: T) => T,
  ) {
    const tableBackup = backup.tables[key];
    const rows = (tableBackup?.rows ?? []) as T[];
    if (rows.length === 0) {
      summary.push({ table: key, inserted: 0, skipped: 0 });
      return;
    }
    const stamped = rows.map((row) => stampOrg(reviveDates(row, key) as T));
    const inserted = await db.insert(table).values(stamped).onConflictDoNothing().returning();
    summary.push({ table: key, inserted: inserted.length, skipped: rows.length - inserted.length });
  }

  await restoreTable("customers", customers, (row) => ({ ...row, organizationId }));
  await restoreTable("vehicles", vehicles, (row) => ({ ...row, organizationId }));
  await restoreTable("catalog_items", catalogItems, (row) => ({ ...row, organizationId }));
  await restoreTable("work_order_counters", workOrderCounters, (row) => ({
    ...row,
    organizationId,
  }));
  await restoreTable("work_orders", workOrders, (row) => ({ ...row, organizationId }));
  // `work_order_items` não carrega `organizationId` — já chega isolado
  // por depender de um `work_order_id` que só existe dentro desta
  // organização (a FK do Postgres barra qualquer outra coisa).
  await restoreTable("work_order_items", workOrderItems, (row) => row);

  return summary;
}

export interface SystemBackupFile {
  version: number;
  exportedAt: string;
  scope: "system";
  organizations: BackupFile[];
}

/**
 * Backup de TODAS as organizações da plataforma, pro dono — só exporta
 * (sem restauração de sistema inteiro): restaurar tudo de volta cruzaria
 * `memberships.userId` com contas do Supabase Auth que podem não existir
 * mais nesse estado, e um erro no meio de restaurar múltiplas
 * organizações de uma vez é um risco grande demais pra automatizar sem
 * supervisão. Cada organização dentro do arquivo, isoladamente, PODE ser
 * restaurada com `restoreOrgBackup` (mesmo formato de
 * `buildOrgBackup`) — é a via seguro pra recuperar uma oficina
 * específica a partir de um backup de sistema.
 */
export async function buildSystemBackup(): Promise<SystemBackupFile> {
  const orgs = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations);

  const perOrg = await Promise.all(orgs.map((org) => buildOrgBackup(org.id, org.name)));

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    scope: "system",
    organizations: perOrg,
  };
}

/** "Sem linha" = ligado — o padrão é fazer backup automático, não
 * precisa a pessoa opt-in (ela pode DESLIGAR, gravando `false`). */
export async function getAutoBackupEnabled(organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ autoBackupEnabled: organizationBackupSettings.autoBackupEnabled })
    .from(organizationBackupSettings)
    .where(eq(organizationBackupSettings.organizationId, organizationId))
    .limit(1);

  return row?.autoBackupEnabled ?? true;
}

export async function setAutoBackupEnabled(organizationId: string, enabled: boolean) {
  await db
    .insert(organizationBackupSettings)
    .values({ organizationId, autoBackupEnabled: enabled })
    .onConflictDoUpdate({
      target: organizationBackupSettings.organizationId,
      set: { autoBackupEnabled: enabled, updatedAt: new Date() },
    });
}

/** Todas as organizações com backup automático ligado (inclui as sem
 * linha em `organization_backup_settings` — padrão ligado). Usado pelo
 * cron diário. */
export async function listOrgsWithAutoBackupEnabled(): Promise<{ id: string; name: string }[]> {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      autoBackupEnabled: organizationBackupSettings.autoBackupEnabled,
    })
    .from(organizations)
    .leftJoin(
      organizationBackupSettings,
      eq(organizationBackupSettings.organizationId, organizations.id),
    );

  return rows.filter((r) => r.autoBackupEnabled ?? true).map((r) => ({ id: r.id, name: r.name }));
}

/** Grava um snapshot automático e apaga os mais antigos além de
 * `AUTO_BACKUP_RETENTION` — chamado pelo cron, uma vez por organização. */
export async function saveAutomaticBackup(organizationId: string, backup: BackupFile) {
  await db.insert(organizationBackups).values({ organizationId, data: backup });

  const keep = await db
    .select({ id: organizationBackups.id })
    .from(organizationBackups)
    .where(eq(organizationBackups.organizationId, organizationId))
    .orderBy(desc(organizationBackups.createdAt))
    .limit(AUTO_BACKUP_RETENTION);

  const keepIds = keep.map((r) => r.id);
  const old = await db
    .select({ id: organizationBackups.id })
    .from(organizationBackups)
    .where(eq(organizationBackups.organizationId, organizationId));

  const toDelete = old.map((r) => r.id).filter((id) => !keepIds.includes(id));
  if (toDelete.length > 0) {
    await db.delete(organizationBackups).where(inArray(organizationBackups.id, toDelete));
  }
}

export interface OrgBackupSummary {
  id: string;
  createdAt: Date;
}

/** Lista os backups automáticos guardados de uma organização, mais
 * recente primeiro — pra listar na página `/backup`. */
export async function listAutomaticBackups(organizationId: string): Promise<OrgBackupSummary[]> {
  return db
    .select({ id: organizationBackups.id, createdAt: organizationBackups.createdAt })
    .from(organizationBackups)
    .where(eq(organizationBackups.organizationId, organizationId))
    .orderBy(desc(organizationBackups.createdAt));
}

/** Um backup automático específico, já checando que é da organização
 * certa (nunca confia só no id vindo da URL). */
export async function getAutomaticBackup(
  organizationId: string,
  backupId: string,
): Promise<BackupFile | null> {
  const [row] = await db
    .select({ data: organizationBackups.data })
    .from(organizationBackups)
    .where(
      and(
        eq(organizationBackups.id, backupId),
        eq(organizationBackups.organizationId, organizationId),
      ),
    )
    .limit(1);

  return (row?.data as BackupFile) ?? null;
}
