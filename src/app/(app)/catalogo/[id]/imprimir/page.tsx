import { notFound } from "next/navigation";
import { formatDate } from "@/core/format";
import { formatCents } from "@/core/money";
import { getCatalogItemById } from "@/modules/catalogo/queries";
import { getActiveOrg } from "@/core/auth";
import { AutoPrint } from "@/components/auto-print";

/** Impressão da ficha do item de catálogo — mesmo padrão de
 * `(app)/ordens/[id]/imprimir/page.tsx` (ver comentário lá). */
export default async function PrintCatalogItemPage({
  params,
}: PageProps<"/catalogo/[id]/imprimir">) {
  const { id } = await params;
  const [item, org] = await Promise.all([getCatalogItemById(id), getActiveOrg()]);

  if (!item) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 text-sm">
      <AutoPrint />
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">{org.organizationName}</h1>
          <p className="text-muted-foreground">Ficha de item do catálogo</p>
        </div>
        <p className="text-muted-foreground">Emitida em {formatDate(new Date())}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{item.name}</h2>
        <p className="text-muted-foreground">{item.type === "servico" ? "Serviço" : "Peça"}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Unidade" value={item.unit} />
        <Field label="Preço padrão" value={formatCents(item.defaultPriceCents)} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
