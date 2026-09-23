import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Banner de confirmação mostrado na página de detalhe logo depois de
 * criar um registro (ver `?criado=1` que as actions de criar acrescentam
 * no `redirect()`) — deixa claro que salvou e oferece atalho pra
 * cadastrar o próximo sem precisar voltar pra lista primeiro. Some
 * sozinho: o `?criado=1` só existe nessa navegação específica, não
 * sobrevive a um refresh/nova visita.
 */
export function CreatedBanner({
  message,
  createAnotherHref,
  createAnotherLabel,
}: {
  message: string;
  createAnotherHref: string;
  createAnotherLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
      <span className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {message}
      </span>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={createAnotherHref} />}
        className="shrink-0 border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/20"
      >
        {createAnotherLabel}
      </Button>
    </div>
  );
}
