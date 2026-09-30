import { pgTable, pgEnum, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";

export const customerTypeEnum = pgEnum("customer_type", ["pf", "pj"]);
export const customerIeIndicatorEnum = pgEnum("customer_ie_indicator", [
  "contribuinte",
  "isento",
  "nao_contribuinte",
]);
export const customerAddressKindEnum = pgEnum("customer_address_kind", [
  "principal",
  "cobranca",
  "entrega",
]);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    type: customerTypeEnum("type").notNull().default("pf"),
    name: text("name").notNull(),
    // Dados exigidos na emissão de NF-e/NFS-e (opcionais no cadastro).
    legalName: text("legal_name"),
    tradeName: text("trade_name"),
    ieIndicator: customerIeIndicatorEnum("ie_indicator").notNull().default("nao_contribuinte"),
    ie: text("ie"),
    im: text("im"),
    document: text("document"), // CPF ou CNPJ, dígitos apenas
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customers_organization_id_idx").on(table.organizationId),
    index("customers_name_idx").on(table.name),
  ],
);

/** Endereços estruturados (NF-e exige logradouro, número, bairro, município,
 * UF, CEP e código IBGE). O form edita só o `principal`; `customers.address`
 * (texto livre) fica como fallback de dados antigos. */
export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    kind: customerAddressKindEnum("kind").notNull().default("principal"),
    zip: text("zip"),
    street: text("street"),
    number: text("number"),
    complement: text("complement"),
    district: text("district"),
    city: text("city"),
    state: text("state"),
    // Código IBGE do município (7 dígitos).
    ibgeCode: text("ibge_code"),
    countryCode: text("country_code").notNull().default("1058"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_addresses_organization_id_idx").on(table.organizationId),
    index("customer_addresses_customer_id_idx").on(table.customerId),
    uniqueIndex("customer_addresses_principal_uq")
      .on(table.customerId)
      .where(sql`${table.kind} = 'principal'`),
  ],
);

export const customersRelations = relations(customers, ({ one }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
}));
