import { withOrg } from "@/core/auth";
import { toCsv } from "@/core/csv";
import { customers, customerAddresses } from "@/modules/clientes/schema";
import { and, eq } from "drizzle-orm";

const HEADERS = [
  "name",
  "type",
  "document",
  "phone",
  "email",
  "legalName",
  "tradeName",
  "ieIndicator",
  "ie",
  "im",
  "zip",
  "street",
  "number",
  "complement",
  "district",
  "city",
  "state",
  "ibgeCode",
  "notes",
];

/**
 * Exporta todos os clientes da organização em CSV — colunas com os
 * MESMOS nomes que `POST /clientes/importar` aceita de volta, pra um
 * export poder virar import noutra instância (ou depois de editar numa
 * planilha) sem precisar remapear coluna nenhuma.
 */
export async function GET() {
  const { withDb, organizationId } = await withOrg();

  const rows = await withDb((tx) =>
    tx
      .select({ c: customers, a: customerAddresses })
      .from(customers)
      .leftJoin(
        customerAddresses,
        and(
          eq(customerAddresses.customerId, customers.id),
          eq(customerAddresses.kind, "principal"),
        ),
      )
      .where(eq(customers.organizationId, organizationId)),
  );

  const csv = toCsv(
    rows.map(({ c, a }) => ({
      name: c.name,
      type: c.type,
      document: c.document ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      legalName: c.legalName ?? "",
      tradeName: c.tradeName ?? "",
      ieIndicator: c.ieIndicator,
      ie: c.ie ?? "",
      im: c.im ?? "",
      zip: a?.zip ?? "",
      street: a?.street ?? "",
      number: a?.number ?? "",
      complement: a?.complement ?? "",
      district: a?.district ?? "",
      city: a?.city ?? "",
      state: a?.state ?? "",
      ibgeCode: a?.ibgeCode ?? "",
      notes: c.notes ?? "",
    })),
    HEADERS,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clientes.csv"',
    },
  });
}
