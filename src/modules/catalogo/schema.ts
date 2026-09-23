import { pgTable, pgEnum, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";

export const catalogItemTypeEnum = pgEnum("catalog_item_type", ["servico", "peca"]);

export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    type: catalogItemTypeEnum("type").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("un"),
    // Preço padrão em centavos — sugestão pro autocomplete da OS, cada
    // item de OS pode sobrescrever com um valor diferente (ver
    // modules/ordens/schema.ts).
    defaultPriceCents: integer("default_price_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("catalog_items_organization_id_idx").on(table.organizationId),
    index("catalog_items_org_type_idx").on(table.organizationId, table.type),
  ],
);

export const catalogItemsRelations = relations(catalogItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [catalogItems.organizationId],
    references: [organizations.id],
  }),
}));
