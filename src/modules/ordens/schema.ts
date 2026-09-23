import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";
import { customers } from "@/modules/clientes/schema";
import { vehicles } from "@/modules/veiculos/schema";
import { catalogItemTypeEnum } from "@/modules/catalogo/schema";

/**
 * Orçamento não é uma entidade separada: é uma `work_order` com
 * `status = 'orcamento'`. "Aprovar orçamento" é a transição pra
 * `aprovada` — um clique, zero duplicação de modelo. Transições válidas
 * (ver `domain.ts#isValidTransition`, testado sem banco):
 *   orcamento -> aprovada | cancelada
 *   aprovada -> em_andamento | cancelada
 *   em_andamento -> concluida | cancelada
 *   concluida -> entregue
 *   entregue, cancelada: terminais.
 */
export const workOrderStatusEnum = pgEnum("work_order_status", [
  "orcamento",
  "aprovada",
  "em_andamento",
  "concluida",
  "entregue",
  "cancelada",
]);

/**
 * Contador do número sequencial da OS, um por organização — não dá pra
 * usar uma SEQUENCE nativa do Postgres (é global, não por tenant); um
 * `UPDATE ... SET last_number = last_number + 1 RETURNING` atômico
 * cumpre o mesmo papel sem corrida entre duas OSs criadas ao mesmo tempo
 * na mesma oficina.
 */
export const workOrderCounters = pgTable("work_order_counters", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  lastNumber: integer("last_number").notNull().default(0),
});

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    number: integer("number").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    status: workOrderStatusEnum("status").notNull().default("orcamento"),
    kmEntrada: integer("km_entrada"),
    relatoCliente: text("relato_cliente"),
    diagnostico: text("diagnostico"),
    discountCents: integer("discount_cents").notNull().default(0),
    // Total é recalculado pela aplicação (soma dos itens - desconto) a
    // cada mutação de item ou desconto — não é coluna gerada porque
    // depende de uma tabela filha (work_order_items), que o Postgres não
    // permite referenciar num GENERATED ALWAYS AS. Ver
    // domain.ts#calculateOrderTotal (função pura, testada sem banco).
    totalCents: integer("total_cents").notNull().default(0),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("work_orders_organization_id_idx").on(table.organizationId),
    index("work_orders_customer_id_idx").on(table.customerId),
    index("work_orders_vehicle_id_idx").on(table.vehicleId),
    index("work_orders_status_idx").on(table.status),
    uniqueIndex("work_orders_org_number_unique").on(table.organizationId, table.number),
  ],
);

export const workOrderItems = pgTable(
  "work_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    type: catalogItemTypeEnum("type").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    // Coluna gerada: total = round(quantidade * valor unitário). Só
    // depende de colunas da própria linha, por isso pode ser
    // `generatedAlwaysAs` de verdade (ao contrário do total da OS).
    totalCents: integer("total_cents").generatedAlwaysAs(sql`round(quantity * unit_price_cents)`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("work_order_items_work_order_id_idx").on(table.workOrderId)],
);

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workOrders.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, { fields: [workOrders.customerId], references: [customers.id] }),
  vehicle: one(vehicles, { fields: [workOrders.vehicleId], references: [vehicles.id] }),
  items: many(workOrderItems),
}));

export const workOrderItemsRelations = relations(workOrderItems, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [workOrderItems.workOrderId],
    references: [workOrders.id],
  }),
}));
