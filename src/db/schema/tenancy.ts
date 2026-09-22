import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Tabelas de tenancy — fundação, não um módulo plugável. Toda tabela de
 * negócio (clientes, veículos, ordens...) referencia `organizations.id` e
 * tem RLS habilitada com base em `memberships` (ver
 * src/db/migrations-custom/0001_rls_policies.sql). A RLS aqui é defesa em
 * profundidade, não a proteção ativa — ver docs/decisoes.md (2026-09-22,
 * "bypassrls").
 */

export const organizationStatusEnum = pgEnum("organization_status", ["active", "blocked"]);
export const billingStatusEnum = pgEnum("billing_status", ["em_dia", "atrasado", "cancelado"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  document: text("document"), // CNPJ ou CPF da oficina
  phone: text("phone"),
  address: text("address"),

  // Controle de acesso pelo dono da plataforma (área /admin). `status`
  // é o portão de acesso de verdade (checado em core/auth.ts#getActiveOrg);
  // `billingStatus`/`nextDueDate`/`billingNotes` são só informativos — o
  // bloqueio é sempre uma decisão manual do admin, nunca automático (ver
  // "Prioridade" em docs/decisoes.md).
  status: organizationStatusEnum("status").notNull().default("active"),
  billingStatus: billingStatusEnum("billing_status").notNull().default("em_dia"),
  nextDueDate: date("next_due_date"),
  billingNotes: text("billing_notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membershipRoleEnum = pgEnum("membership_role", ["owner", "staff"]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // FK lógica para auth.users (gerenciado pelo Supabase Auth, fora do
    // schema do Drizzle) — validada por constraint em SQL puro, ver
    // migrations-custom/0001_rls_policies.sql.
    userId: uuid("user_id").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("staff"),
    // Permite bloquear uma pessoa específica dentro de uma oficina (ex.:
    // um mecânico que saiu), sem bloquear a oficina inteira — diferente de
    // organizations.status, que bloqueia todo mundo daquela organização.
    // Sem UI própria ainda; existe para não precisar de outra migration
    // quando a tela de equipe for construída.
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("memberships_user_org_unique").on(table.userId, table.organizationId)],
);

/**
 * Quem é dono da plataforma (você). Nunca lido via `withOrg()` — só pelo
 * backend de admin (`core/admin/`), que roda sobre a mesma conexão que já
 * ignora RLS (ver docs/decisoes.md). A tabela em si tem RLS habilitada por
 * padrão de defesa em profundidade, mas a proteção real é
 * `requireAdmin()` checando esta tabela antes de qualquer query de admin.
 */
export const platformAdmins = pgTable("platform_admins", {
  userId: uuid("user_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Personalização por oficina: liga/desliga um módulo especificamente para
 * uma organização (ex.: dar acesso antecipado a um módulo novo só para
 * quem pediu). Sem linha para um módulo = usa o padrão do próprio módulo
 * (`ModuleDefinition.enabled`). Só editado pelo admin.
 */
export const organizationModuleSettings = pgTable(
  "organization_module_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    moduleSlug: text("module_slug").notNull(),
    enabled: boolean("enabled").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("org_module_settings_unique").on(table.organizationId, table.moduleSlug)],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  moduleSettings: many(organizationModuleSettings),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationModuleSettingsRelations = relations(
  organizationModuleSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationModuleSettings.organizationId],
      references: [organizations.id],
    }),
  }),
);
