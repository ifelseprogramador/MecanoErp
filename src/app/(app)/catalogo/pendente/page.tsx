"use client";

import { useEffect, useState } from "react";
import { ActionLink } from "@/components/action-link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/core/money";
import { getPendingAction } from "@/core/offline/queue";
import type { PendingAction } from "@/core/offline/db";
import type { CatalogItemInput } from "@/modules/catalogo/validation";

/**
 * Ficha de um item de catálogo criado OFFLINE — mesmo padrão de
 * `(app)/clientes/pendente/page.tsx` (ver comentários lá pro porquê de
 * cada detalhe: rota estática com `?id=`, leitura de `window.location`
 * em vez de `useSearchParams()`, etc.).
 */
export default function PendingCatalogItemPage() {
  return <PendingCatalogItemContent />;
}

function PendingCatalogItemContent() {
  const [id, setId] = useState<string | null>(null);
  const [action, setAction] = useState<PendingAction | null | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(new URLSearchParams(window.location.search).get("id") ?? "");
  }, []);

  useEffect(() => {
    if (!id) return;
    getPendingAction(id).then((found) => setAction(found ?? null));
  }, [id]);

  if (id === null || (action === undefined && id)) {
    return <p className="text-muted-foreground p-6 text-sm">Carregando...</p>;
  }

  if (!action) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          Este registro pendente não foi encontrado neste navegador — ou já sincronizou. Confira{" "}
          {id && (
            <>
              <ActionLink href={`/catalogo/${id}`} inline>
                o item
              </ActionLink>{" "}
              ou volte pro{" "}
            </>
          )}
          <ActionLink href="/catalogo" icon={ArrowRight} inline>
            catálogo
          </ActionLink>
          .
        </p>
      </div>
    );
  }

  const data = action.record as CatalogItemInput;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
        <Badge variant="outline" className="gap-1">
          <RefreshCw className="h-3 w-3" />
          {action.status === "error" ? "Erro ao sincronizar" : "Pendente de sincronização"}
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm">
        Criado offline — vai aparecer pros outros e ficar disponível de qualquer aparelho assim que
        a internet voltar e sincronizar sozinho.
        {action.status === "error" && action.errorMessage && (
          <span className="text-destructive block">{action.errorMessage}</span>
        )}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Dados do item</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label="Tipo" value={data.type === "servico" ? "Serviço" : "Peça"} />
          <Field label="Unidade" value={data.unit} />
          <Field label="Preço padrão" value={formatCents(data.defaultPriceCents)} />
        </CardContent>
      </Card>
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
