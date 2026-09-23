import { withOrg } from "@/core/auth";
import { toCsv } from "@/core/csv";
import { customers } from "@/modules/clientes/schema";
import { eq } from "drizzle-orm";

const HEADERS = ["name", "type", "document", "phone", "email", "address", "notes"];

/**
 * Exporta todos os clientes da organização em CSV — colunas com os
 * MESMOS nomes que `POST /clientes/importar` aceita de volta, pra um
 * export poder virar import noutra instância (ou depois de editar numa
 * planilha) sem precisar remapear coluna nenhuma.
 */
export async function GET() {
  const { db, organizationId } = await withOrg();

  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.organizationId, organizationId));

  const csv = toCsv(
    rows.map((c) => ({
      name: c.name,
      type: c.type,
      document: c.document ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
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
