import { pgTable, pgEnum, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./tenancy";

/** "aviso" (algo que exige atenção — manutenção, mudança de regra),
 * "novidade" (funcionalidade nova) ou "dica" (sugestão de uso) — o
 * ícone/cor no sino do usuário (`notification-bell.tsx`) varia por
 * categoria, pra dar pra identificar o tipo de relance sem abrir. */
export const notificationCategoryEnum = pgEnum("notification_category", [
  "aviso",
  "novidade",
  "dica",
]);

/**
 * Avisos que o dono da plataforma manda pras oficinas — não é um
 * "módulo" plugável de negócio (como `clientes`/`ordens`), é operação da
 * plataforma, mesma categoria de `core/admin/` e `live-support`. Vive em
 * `db/schema/` (fundação) em vez de `modules/` por isso.
 *
 * `organizationId` nulo = pra TODAS as oficinas; preenchido = só pra
 * uma. `createdBy` é o id do admin (auth.users, fora do schema do
 * Drizzle — mesmo padrão de `memberships.userId`, validado por
 * constraint em SQL puro na migration custom).
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    category: notificationCategoryEnum("category").notNull().default("aviso"),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_organization_id_idx").on(table.organizationId)],
);

/**
 * Quem leu — por PESSOA (`userId`, não por oficina inteira), pra o dono
 * saber exatamente quem viu o aviso. `organizationId` guardado junto só
 * pra não precisar de outro join pra mostrar "de qual oficina" na lista
 * de leitores.
 */
export const notificationReads = pgTable(
  "notification_reads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_reads_unique").on(table.notificationId, table.userId),
    index("notification_reads_notification_id_idx").on(table.notificationId),
  ],
);
