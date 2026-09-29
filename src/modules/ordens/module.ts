import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { workOrderCounters, workOrders } from "./schema";

registerModule({
  slug: "ordens",
  label: "Ordens de serviço",
  iconName: "ClipboardList",
  href: "/ordens",
  order: 40,
  enabled: true,
  dependsOn: ["clientes", "veiculos", "catalogo"],
});

registerBackupTable({
  key: "work_order_counters",
  table: workOrderCounters,
});

// `work_order_items` fica de fora do backup por organização — não tem
// `organization_id` próprio (é filtrado via `work_order_id`), e o motor
// genérico de `core/backup.ts` só sabe filtrar tabelas com essa coluna
// direta. Mesma limitação já aceita em prisma/pedido_itens (ver
// docs/decisoes.md).
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
