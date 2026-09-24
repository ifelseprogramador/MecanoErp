"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { APP_VERSION, CHANGELOG, type ChangeType } from "@/core/changelog";

const LAST_SEEN_KEY = "mecanoerp:last-seen-version";

const TYPE_META: Record<ChangeType, { label: string; className: string }> = {
  novo: {
    label: "Novo",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  melhoria: {
    label: "Melhoria",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  correcao: {
    label: "Correção",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
};

function formatChangelogDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Selo "vX.Y.Z" discreto no canto do menu. Clique abre o histórico de
 * versões (`core/changelog.ts`). Uma bolinha aparece enquanto a pessoa
 * ainda não abriu o histórico desde a última atualização — some ao
 * abrir. Guardado em `localStorage` (conveniência por navegador; se
 * não der pra ler/gravar, só não mostra a bolinha).
 */
export function VersionBadge({ className }: { className?: string }) {
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    try {
      // `localStorage` não existe no render do servidor — só dá pra
      // comparar depois de montar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasUnseen(localStorage.getItem(LAST_SEEN_KEY) !== APP_VERSION);
    } catch {
      // modo privado/armazenamento bloqueado: segue sem a bolinha.
    }
  }, []);

  function handleOpenChange(open: boolean) {
    if (!open) return;
    setHasUnseen(false);
    try {
      localStorage.setItem(LAST_SEEN_KEY, APP_VERSION);
    } catch {
      // idem acima.
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            title="Ver o que mudou"
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
              className,
            )}
          />
        }
      >
        <History className="h-3 w-3" />v{APP_VERSION}
        {hasUnseen && (
          <span className="bg-primary absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full" />
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>O que mudou</DialogTitle>
          <DialogDescription>Você está na versão {APP_VERSION}.</DialogDescription>
        </DialogHeader>
        <div className="-mx-4 flex max-h-[65vh] flex-col gap-5 overflow-y-auto px-4">
          {CHANGELOG.map((entry, index) => (
            <section key={entry.version} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="font-semibold">v{entry.version}</h3>
                <span className="text-muted-foreground text-xs">
                  {formatChangelogDate(entry.date)}
                </span>
                {index === 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                    Atual
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {entry.changes.map((change) => {
                  const meta = TYPE_META[change.type];
                  return (
                    <li key={change.text} className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                          meta.className,
                        )}
                      >
                        {meta.label}
                      </span>
                      <span>{change.text}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
