import { ActionLink } from "@/components/action-link";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImportForm } from "@/components/csv-import-form";
import { importCustomersCsv } from "@/modules/clientes/actions";

export default function ImportCustomersPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Importar clientes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Arquivo CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Colunas esperadas: <code>name</code>, <code>type</code> (pf ou pj),{" "}
            <code>document</code>, <code>phone</code>, <code>email</code>; dados fiscais opcionais:{" "}
            <code>legalName</code>, <code>tradeName</code>, <code>ieIndicator</code>,{" "}
            <code>ie</code>, <code>im</code>; endereço opcional: <code>zip</code>,{" "}
            <code>street</code>, <code>number</code>, <code>complement</code>, <code>district</code>
            , <code>city</code>, <code>state</code>, <code>ibgeCode</code>; e <code>notes</code>.
            Baixe{" "}
            <ActionLink href="/clientes/exportar" icon={Download} inline>
              a lista atual em CSV
            </ActionLink>{" "}
            pra usar como modelo — linhas com erro não impedem as outras de importar.
          </p>
          <CsvImportForm action={importCustomersCsv} entityLabel="clientes" />
        </CardContent>
      </Card>
    </div>
  );
}
