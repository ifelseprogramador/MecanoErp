import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { sql } from "drizzle-orm";
import { workOrderCounters, workOrderItems, workOrders } from "./schema";

registerModule({
  slug: "ordens",
  label: "Ordens de serviço",
  iconName: "ClipboardList",
  href: "/ordens",
  order: 40,
  enabled: true,
  dependsOn: ["clientes", "veiculos", "catalogo"],
});

// Contador de numeração das ordens: registrado DEPOIS de `work_orders` (abaixo) para
// o `afterRestore` enxergar os números já restaurados.
registerBackupTable({
  key: "work_orders",
  table: workOrders,
  dateColumns: [
    "approvedAt",
    "startedAt",
    "completedAt",
    "deliveredAt",
    "cancelledAt",
    "createdAt",
    "updatedAt",
  ],
});

// `work_order_items` não tem `organization_id` próprio (é da organização pela OS) —
// entra no backup pela tabela-pai (`parent`). Registrado DEPOIS de `work_orders`:
// a restauração segue esta ordem.
registerBackupTable({
  key: "work_order_items",
  table: workOrderItems,
  parent: { table: workOrders, foreignKey: "workOrderId" },
  dateColumns: ["createdAt"],
});

registerBackupTable({
  key: "work_order_counters",
  table: workOrderCounters,
  afterRestore: async (db, organizationId) => {
    await db.execute(sql`
      insert into work_order_counters (organization_id, last_number)
      select ${organizationId}::uuid, coalesce(max(number), 0)
      from work_orders where organization_id = ${organizationId}::uuid
      on conflict (organization_id)
      do update set last_number = greatest(work_order_counters.last_number, excluded.last_number)
    `);
  },
});
