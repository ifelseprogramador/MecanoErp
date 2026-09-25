import { ActionLink } from "@/components/action-link";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImportForm } from "@/components/csv-import-form";
import { importVehiclesCsv } from "@/modules/veiculos/actions";

export default function ImportVehiclesPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Importar veículos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Arquivo CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Colunas esperadas: <code>plate</code>, <code>brand</code>, <code>model</code>,{" "}
            <code>year</code>, <code>color</code>, <code>fuel</code>, <code>chassis</code>,{" "}
            <code>currentKm</code>, <code>customerDocument</code>, <code>customerName</code>. O
            cliente já precisa existir — é achado pelo documento (ou, se vazio, pelo nome exato).
            Baixe{" "}
            <ActionLink href="/veiculos/exportar" icon={Download} inline>
              a lista atual em CSV
            </ActionLink>{" "}
            pra usar como modelo.
          </p>
          <CsvImportForm action={importVehiclesCsv} entityLabel="veículos" />
        </CardContent>
      </Card>
    </div>
  );
}
