import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";
import { customers } from "@/modules/clientes/schema";

export const fuelTypeEnum = pgEnum("fuel_type", [
  "gasolina",
  "etanol",
  "flex",
  "diesel",
  "eletrico",
  "gnv",
]);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    plate: text("plate").notNull(),
    brand: text("brand"),
    model: text("model"),
    year: integer("year"),
    color: text("color"),
    fuel: fuelTypeEnum("fuel"),
    chassis: text("chassis"),
    currentKm: integer("current_km"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vehicles_organization_id_idx").on(table.organizationId),
    index("vehicles_customer_id_idx").on(table.customerId),
    // Placa é única por oficina, não globalmente — evita conflito
    // artificial entre organizações diferentes no mesmo banco.
    uniqueIndex("vehicles_org_plate_unique").on(table.organizationId, table.plate),
  ],
);

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  organization: one(organizations, {
    fields: [vehicles.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [vehicles.customerId],
    references: [customers.id],
  }),
}));
