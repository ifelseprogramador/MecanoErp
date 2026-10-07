import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  integer,
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
  // Nome que aparece nos documentos enviados ao cliente (PDF, link, mensagem).
  // Editável pelo dono da conta; vazio = usa `name`.
  displayName: text("display_name"),
  document: text("document"), // CNPJ ou CPF da oficina
  phone: text("phone"),
  address: text("address"),

  // Branding da organização (não do dono da plataforma) — aplicado no
  // shell do app para toda a equipe daquela oficina. Só quem tem
  // `role === "owner"` edita (checado em `core/profile/actions.ts`, não
  // em RLS separada). `primaryColor` é hex (ex.: "#2563eb"), sobrescreve
  // `--primary` em `globals.css`; `logoUrl` aponta para um objeto no
  // bucket público `branding` do Supabase Storage.
  primaryColor: text("primary_color"),
  sidebarColor: text("sidebar_color"),
  logoUrl: text("logo_url"),

  // Controle de acesso pelo dono da plataforma (área /admin). `status`
  // é o portão de acesso de verdade (checado em core/auth.ts#getActiveOrg);
  // `billingStatus`/`nextDueDate`/`billingNotes` são só informativos — o
  // bloqueio é sempre uma decisão manual do admin, nunca automático (ver
  // "Prioridade" em docs/decisoes.md).
  status: organizationStatusEnum("status").notNull().default("active"),
  billingStatus: billingStatusEnum("billing_status").notNull().default("em_dia"),
  nextDueDate: date("next_due_date"),
  billingNotes: text("billing_notes"),

  // Multiusuário — liberado SÓ pelo dono da plataforma (área /admin; o
  // trigger `restrict_organization_branding_update` impede o dono da
  // conta de alterar). `multiUser = false` (padrão) = oficina de uma
  // pessoa só: sem tela de equipe, sem convite. `true` = o dono da conta
  // pode convidar até `seatLimit` pessoas ATIVAS (contando ele mesmo).
  // `extraSeatPriceCents` é só informativo (valor do usuário extra).
  multiUser: boolean("multi_user").notNull().default(false),
  seatLimit: integer("seat_limit").notNull().default(1),
  extraSeatPriceCents: integer("extra_seat_price_cents"),
  // Quanto um usuário DESTA oficina espera por atendimento ao "Chamar suporte"
  // (com o dono da plataforma online) antes de o pedido virar "sem
  // atendimento" e o Telegram avisar. Por oficina, não global; 5–300 s (check
  // no banco); só o dono da plataforma altera (gatilho de organizations).
  supportWaitSeconds: integer("support_wait_seconds").notNull().default(30),

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
    // Quem convidou (dono da conta) e quando — null para o dono criado
    // pelo admin da plataforma.
    invitedBy: uuid("invited_by"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    // Setor da pessoa (texto livre, ex.: "Oficina", "Financeiro") — só
    // organização visual na tela de equipe, não controla acesso (quem
    // controla é `membership_modules`).
    department: text("department"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("memberships_user_org_unique").on(table.userId, table.organizationId)],
);

/**
 * Quais módulos cada pessoa (`staff`) pode acessar — escolhido pelo dono
 * da conta em `/equipe`, sempre dentro dos módulos que a organização tem
 * habilitados (`organization_module_settings`). O `owner` não precisa de
 * linhas aqui: acessa tudo. Sem linha = sem acesso àquele módulo.
 * `organizationId` fica redundante de propósito (RLS por organização sem
 * join) — ver migrations-custom/0009_multiuser_team.sql.
 */
export const membershipModules = pgTable(
  "membership_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    moduleSlug: text("module_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("membership_modules_unique").on(table.membershipId, table.moduleSlug)],
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
  // Última batida de presença do painel `/admin` aberto
  // (`core/live-support/actions.ts#adminHeartbeat`, a cada ~20 s). "Online"
  // = bateu há menos de ~45 s — decide, no servidor, se um pedido de suporte
  // espera atendimento ou já vira "perdido" + aviso no Telegram.
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
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
