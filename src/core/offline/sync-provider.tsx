"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SW_CACHE_NAME } from "./constants";
import { listPendingActions, QUEUE_CHANGED_EVENT } from "./queue";
import { runSyncQueue } from "./sync-engine";
import { useOnlineStatus } from "./use-online-status";

/**
 * Uma rota "pendente" por módulo com suporte a criar offline. Precisa
 * de DUAS coisas em cache, de fontes diferentes:
 * - `load()` (um `import()` dinâmico do módulo da própria página):
 *   `router.prefetch()` sozinho NÃO é suficiente — na prática ele nem
 *   sempre busca o(s) chunk(s) JavaScript da página em si (confirmado
 *   testando offline: o chunk nunca aparecia no Cache Storage antes de
 *   perder conexão, resultando em `ChunkLoadError` ao tentar hidratar).
 *   Um `import()` explícito força o carregador de módulos do navegador a
 *   buscar e EXECUTAR o chunk de verdade agora, o que passa pelo service
 *   worker e garante que ele fique cacheado.
 * - `fetch()` cru direto daqui: pega o HTML de verdade (o Next decide o
 *   formato da resposta pelos headers da requisição — sem os headers
 *   especiais de RSC que o roteador do Next manda, vem HTML normal,
 *   igual uma navegação de página cheia) — é ESSE que o service worker
 *   (`public/sw.js`, modo "navigate") serve quando `window.location.href`
 *   (não `router.push()`, ver `use-offline-create-action.ts`) tenta
 *   abrir a página offline.
 */
const PENDING_ROUTES = [
  {
    path: "/clientes/pendente",
    load: () => import("@/app/(app)/clientes/pendente/page"),
  },
];

/**
 * Montado em `(app)/layout.tsx` — só dentro da área autenticada, nunca
 * na tela de login: o service worker instala assim que este componente
 * monta, e uma instalação acontecendo sem sessão ainda tentaria
 * pré-cachear rota protegida, recebendo de volta a tela de "sessão
 * expirou" em vez do conteúdo de verdade. Registra o service worker
 * (public/sw.js, só cache de leitura — ver comentário lá) e, sempre que
 * a conexão volta, roda a fila de ações pendentes
 * (`core/offline/sync-engine.ts`) sozinho, sem a pessoa precisar fazer
 * nada. Mostra uma barra fixa só quando tem alguma pendência ou acabou
 * de sincronizar — normalmente invisível.
 */
export function SyncProvider() {
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sem service worker o app continua funcionando online — só
        // perde a leitura offline de páginas já visitadas. Não é motivo
        // pra travar nada, só não tenta de novo.
      });
    }
    for (const { path, load } of PENDING_ROUTES) {
      load().catch(() => {});
      if ("caches" in window) {
        fetch(path)
          .then((response) => {
            if (response.ok) {
              return caches.open(SW_CACHE_NAME).then((cache) => cache.put(path, response));
            }
          })
          .catch(() => {
            // Offline logo de cara (raro, mas possível): sem problema,
            // só não tem o precache extra dessa rota ainda.
          });
      }
    }
  }, []);

  async function refreshPendingCount() {
    const pending = await listPendingActions();
    setPendingCount(pending.length);
  }

  useEffect(() => {
    // Busca async no IndexedDB — o `setState` só acontece depois de
    // resolvida a Promise, nunca de forma síncrona dentro do corpo do
    // efeito; é a mesma leitura inicial que o listener abaixo já faria
    // de qualquer jeito a cada mudança na fila.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPendingCount();
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshPendingCount);
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, refreshPendingCount);
  }, []);

  useEffect(() => {
    if (!isOnline || syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);
    runSyncQueue()
      .then(({ synced, failed }) => {
        if (synced > 0) {
          toast.success(
            synced === 1 ? "1 pendência sincronizada." : `${synced} pendências sincronizadas.`,
          );
          router.refresh();
        }
        if (failed > 0) {
          toast.error("Algumas pendências não sincronizaram — vamos tentar de novo em breve.");
        }
      })
      .finally(() => {
        syncingRef.current = false;
        setIsSyncing(false);
        void refreshPendingCount();
      });
  }, [isOnline, router]);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium ${
        isOnline ? "bg-amber-100 text-amber-900" : "bg-zinc-800 text-zinc-50"
      }`}
    >
      {isOnline ? (
        <>
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing
            ? "Sincronizando o que foi feito offline..."
            : `${pendingCount} ${pendingCount === 1 ? "pendência" : "pendências"} aguardando sincronizar.`}
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          Sem conexão — o que você criar agora fica guardado e sincroniza sozinho depois.
          {pendingCount > 0 &&
            ` (${pendingCount} ${pendingCount === 1 ? "pendência" : "pendências"})`}
        </>
      )}
    </div>
  );
}
