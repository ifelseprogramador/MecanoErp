"use client";

import { useActionState } from "react";
import { CheckCircle2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CsvImportState } from "@/core/csv-import";

const initialState: CsvImportState = { status: "idle" };

/**
 * Form de importação CSV genérico — mesmo componente pra qualquer
 * módulo, só troca a `action`. Não duplicar isto em
 * `modules/<modulo>/components/`.
 */
export function CsvImportForm({
  action,
  entityLabel,
}: {
  action: (prevState: CsvImportState, formData: FormData) => Promise<CsvImportState>;
  entityLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="file">Arquivo CSV</Label>
          <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        {state.status === "error" && <p className="text-destructive text-sm">{state.message}</p>}
        <Button type="submit" disabled={isPending} className="self-start">
          <Upload className="h-4 w-4" />
          {isPending ? "Importando..." : `Importar ${entityLabel}`}
        </Button>
      </form>

      {state.status === "done" && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <p className="text-sm font-medium">
            {state.summary.imported} de {state.summary.totalRows} linha
            {state.summary.totalRows === 1 ? "" : "s"} importada
            {state.summary.imported === 1 ? "" : "s"} com sucesso.
          </p>
          {state.summary.results.some((r) => !r.ok) && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {state.summary.results.map((r) => (
                <li
                  key={r.row}
                  className={`flex items-start gap-2 ${r.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
                >
                  {r.ok ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    Linha {r.row}
                    {r.message ? `: ${r.message}` : " importada."}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
