"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

// Servidor não tem `navigator` — assume "online" até hidratar no
// cliente (mesmo valor dos dois lados na primeira renderização evita
// divergência de hidratação; `useSyncExternalStore` troca pro valor
// real automaticamente logo em seguida).
function getServerSnapshot() {
  return true;
}

/** `navigator.onLine` como estado React, via `useSyncExternalStore` — o
 * jeito canônico do React de sincronizar com uma fonte de estado externa
 * e mutável (não é 100% preciso: um captive portal ou DNS fora do ar
 * ainda reporta "online" — é um sinal RÁPIDO pra decidir se tenta a rede
 * antes; o fallback de verdade é o `catch` de erro de rede em
 * `use-offline-create-action.ts`). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
