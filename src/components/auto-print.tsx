"use client";

import { useEffect } from "react";

/**
 * Abre o diálogo de impressão do navegador sozinho, assim que a página de
 * impressão termina de carregar — em vez de depender da pessoa apertar
 * Ctrl+P por conta própria depois de abrir a aba. Colocar no topo de
 * qualquer `[id]/imprimir/page.tsx`.
 */
export function AutoPrint() {
  useEffect(() => {
    window.print();
  }, []);

  return null;
}
