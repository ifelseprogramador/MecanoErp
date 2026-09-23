import { eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { toCsv } from "@/core/csv";
import { catalogItems } from "@/modules/catalogo/schema";

const HEADERS = ["type", "name", "unit", "defaultPrice"];

/** `defaultPrice` em reais (ex.: "99,90"), não centavos — mesma unidade
 * que a pessoa digita no formulário, pra editar numa planilha sem
 * precisar converter na cabeça. */
export async function GET() {
  const { db, organizationId } = await withOrg();

  const rows = await db
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.organizationId, organizationId));

  const csv = toCsv(
    rows.map((item) => ({
      type: item.type,
      name: item.name,
      unit: item.unit,
      defaultPrice: (item.defaultPriceCents / 100).toFixed(2).replace(".", ","),
    })),
    HEADERS,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="catalogo.csv"',
    },
  });
}
