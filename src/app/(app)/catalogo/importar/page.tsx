import { ActionLink } from "@/components/action-link";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImportForm } from "@/components/csv-import-form";
import { importCatalogItemsCsv } from "@/modules/catalogo/actions";

export default function ImportCatalogItemsPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Importar catálogo</h1>
      <Card>
        <CardHeader>
          <CardTitle>Arquivo CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Colunas esperadas: <code>type</code> (servico ou peca), <code>name</code>,{" "}
            <code>unit</code>, <code>defaultPrice</code> (em reais, ex.: 99,90). Baixe{" "}
            <ActionLink href="/catalogo/exportar" icon={Download} inline>
              a lista atual em CSV
            </ActionLink>{" "}
            pra usar como modelo.
          </p>
          <CsvImportForm action={importCatalogItemsCsv} entityLabel="itens" />
        </CardContent>
      </Card>
    </div>
  );
}
