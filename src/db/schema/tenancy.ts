import { pgTable, pgEnum, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Tabelas de tenancy — fundação, não um módulo plugável. Toda tabela de
 * negócio (clientes, veículos, ordens...) referencia `organizations.id` e
 * tem RLS habilitada com base em `memberships` (ver
 * src/db/migrations-custom/0001_rls_policies.sql).
 */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  document: text("document"), // CNPJ ou CPF da oficina
  phone: text("phone"),
  address: text("address"),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("memberships_user_org_unique").on(table.userId, table.organizationId)],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}));
