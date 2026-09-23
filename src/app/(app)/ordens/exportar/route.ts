import { eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { toCsv } from "@/core/csv";
import { formatCents } from "@/core/money";
import { formatDate } from "@/core/format";
import { customers } from "@/modules/clientes/schema";
import { vehicles } from "@/modules/veiculos/schema";
import { workOrders } from "@/modules/ordens/schema";
import { WORK_ORDER_STATUS_LABELS } from "@/modules/ordens";

const HEADERS = ["number", "status", "customerName", "vehiclePlate", "totalCents", "createdAt"];

/**
 * Só EXPORTA (leitura) — diferente de clientes/veiculos/catalogo, não
 * tem `POST /ordens/importar`. Criar uma OS envolve cliente + veículo já
 * existentes, itens e transições de status — importação em massa via
 * CSV seria arriscada demais pra fazer bem (ver docs/decisoes.md).
 */
export async function GET() {
  const { db, organizationId } = await withOrg();

  const rows = await db
    .select({
      number: workOrders.number,
      status: workOrders.status,
      totalCents: workOrders.totalCents,
      createdAt: workOrders.createdAt,
      customerName: customers.name,
      vehiclePlate: vehicles.plate,
    })
    .from(workOrders)
    .innerJoin(customers, eq(customers.id, workOrders.customerId))
    .innerJoin(vehicles, eq(vehicles.id, workOrders.vehicleId))
    .where(eq(workOrders.organizationId, organizationId));

  const csv = toCsv(
    rows.map((o) => ({
      number: String(o.number),
      status: WORK_ORDER_STATUS_LABELS[o.status],
      customerName: o.customerName,
      vehiclePlate: o.vehiclePlate,
      totalCents: formatCents(o.totalCents),
      createdAt: formatDate(o.createdAt),
    })),
    HEADERS,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ordens.csv"',
    },
  });
}
