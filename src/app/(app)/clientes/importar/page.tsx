import Link from "next/link";
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
            <code>document</code>, <code>phone</code>, <code>email</code>, <code>address</code>,{" "}
            <code>notes</code>. Baixe{" "}
            <Link href="/clientes/exportar" className="underline">
              a lista atual em CSV
            </Link>{" "}
            pra usar como modelo — linhas com erro não impedem as outras de importar.
          </p>
          <CsvImportForm action={importCustomersCsv} entityLabel="clientes" />
        </CardContent>
      </Card>
    </div>
  );
}
