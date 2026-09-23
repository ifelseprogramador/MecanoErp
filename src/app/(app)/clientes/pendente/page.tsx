"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDocument } from "@/core/document";
import { getPendingAction } from "@/core/offline/queue";
import type { PendingAction } from "@/core/offline/db";
import type { CustomerInput } from "@/modules/clientes/validation";

/**
 * Ficha de um cliente criado OFFLINE, ainda na fila local
 * (`core/offline/`) — só existe no navegador de quem criou, nunca no
 * servidor ainda, então não dá pra ser a página normal
 * `clientes/[id]` (Server Component, busca no Postgres e dá 404 se não
 * achar).
 *
 * Rota ESTÁTICA com `?id=` na query (não `clientes/pendente/[id]`) de
 * propósito: uma rota dinâmica nova (id nunca visto antes) não tem como
 * ser pré-carregada. `SyncProvider` já roda `router.prefetch()` nesta
 * rota ao montar (com sessão ativa) — o JavaScript dela fica pronto
 * antes de qualquer necessidade real, funciona offline mesmo no
 * PRIMEIRO uso.
 */
export default function PendingCustomerPage() {
  return <PendingCustomerContent />;
}

// Lê o `?id=` direto de `window.location` em vez de `useSearchParams()`: o
// hook do Next exige um `<Suspense>` em volta, e dentro desse limite o
// `router.prefetch()` (ver sync-provider.tsx) não busca o JS da página —
// só na navegação de verdade, o que offline vira `ChunkLoadError`. Essa
// página não depende de nada vindo do servidor, então não precisa da API
// do roteador só pra ler uma query string.
function PendingCustomerContent() {
  const [id, setId] = useState<string | null>(null);
  const [action, setAction] = useState<PendingAction | null | undefined>(undefined);

  useEffect(() => {
    // `window` não existe no render do servidor — precisa esperar o efeito
    // pra ler a query string sem gerar mismatch de hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(new URLSearchParams(window.location.search).get("id") ?? "");
  }, []);

  useEffect(() => {
    if (!id) return; // sem id na URL (ou ainda não lido): mantém o estado inicial (undefined -> tratado como "não achado" abaixo)
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
              <Link href={`/clientes/${id}`} className="underline">
                a ficha
              </Link>{" "}
              ou volte pra{" "}
            </>
          )}
          <Link href="/clientes" className="underline">
            lista de clientes
          </Link>
          .
        </p>
      </div>
    );
  }

  const data = action.record as CustomerInput;

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
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label="Tipo" value={data.type === "pf" ? "Pessoa física" : "Pessoa jurídica"} />
          <Field label="CPF/CNPJ" value={data.document ? formatDocument(data.document) : "—"} />
          <Field label="Telefone" value={data.phone || "—"} />
          <Field label="E-mail" value={data.email || "—"} />
          <Field label="Endereço" value={data.address || "—"} />
          <Field label="Observações" value={data.notes || "—"} />
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
