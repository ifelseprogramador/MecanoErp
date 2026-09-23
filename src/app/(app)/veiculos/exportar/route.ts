import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { toCsv } from "@/core/csv";
import { customers } from "@/modules/clientes/schema";
import { vehicles } from "@/modules/veiculos/schema";

const HEADERS = [
  "plate",
  "brand",
  "model",
  "year",
  "color",
  "fuel",
  "chassis",
  "currentKm",
  "customerDocument",
  "customerName",
];

/**
 * Exporta os veículos em CSV. `customerDocument`/`customerName` (não
 * `customerId`, um UUID interno que ninguém edita numa planilha) são o
 * que `POST /veiculos/importar` usa pra achar o cliente de volta — ver
 * `modules/clientes/queries.ts#findCustomerByDocumentOrName`.
 */
export async function GET() {
  const { db, organizationId } = await withOrg();

  const rows = await db
    .select({
      plate: vehicles.plate,
      brand: vehicles.brand,
      model: vehicles.model,
      year: vehicles.year,
      color: vehicles.color,
      fuel: vehicles.fuel,
      chassis: vehicles.chassis,
      currentKm: vehicles.currentKm,
      customerDocument: customers.document,
      customerName: customers.name,
    })
    .from(vehicles)
    .innerJoin(customers, eq(customers.id, vehicles.customerId))
    .where(and(eq(vehicles.organizationId, organizationId)));

  const csv = toCsv(
    rows.map((v) => ({
      plate: v.plate,
      brand: v.brand ?? "",
      model: v.model ?? "",
      year: v.year?.toString() ?? "",
      color: v.color ?? "",
      fuel: v.fuel ?? "",
      chassis: v.chassis ?? "",
      currentKm: v.currentKm?.toString() ?? "",
      customerDocument: v.customerDocument ?? "",
      customerName: v.customerName,
    })),
    HEADERS,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="veiculos.csv"',
    },
  });
}
