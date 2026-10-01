import { and, asc, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { toCsv } from "@/core/csv";
import { buildExport } from "@/core/spreadsheet/xlsx";
import { customerAddresses, customers } from "@/modules/clientes/schema";
import { SHEET_NAME, clienteColumns, clienteToRow } from "@/modules/clientes/spreadsheet";

/**
 * Exporta todos os clientes no MESMO formato do
 * modelo de importação — dá para editar na planilha e importar de volta.
 * `?formato=csv` devolve CSV. Contém dado pessoal (LGPD).
 */
export async function GET(request: Request) {
  const { organizationId, withDb } = await withOrg();
  const asCsv = new URL(request.url).searchParams.get("formato") === "csv";

  const rows = await withDb(async (tx) => {
    const data = await tx
      .select({ c: customers, e: customerAddresses })
      .from(customers)
      .leftJoin(
        customerAddresses,
        and(
          eq(customerAddresses.customerId, customers.id),
          eq(customerAddresses.kind, "principal"),
        ),
      )
      .where(eq(customers.organizationId, organizationId))
      .orderBy(asc(customers.name));
    return data.map(({ c, e }) => clienteToRow({ ...c, endereco: e }));
  });

  const stamp = new Date().toISOString().slice(0, 10);
  if (asCsv) {
    const headers = clienteColumns.map((c) => c.header);
    const csv = toCsv(
      rows.map((r) => Object.fromEntries(clienteColumns.map((c) => [c.header, r[c.key] ?? ""]))),
      headers,
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clientes-${stamp}.csv"`,
      },
    });
  }

  const file = await buildExport({ sheetName: SHEET_NAME, columns: clienteColumns, rows });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clientes-${stamp}.xlsx"`,
    },
  });
}
