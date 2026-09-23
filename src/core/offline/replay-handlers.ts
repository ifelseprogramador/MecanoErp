"use client";

import { createCustomerRecord } from "@/modules/clientes/actions";
import type { CustomerInput } from "@/modules/clientes/validation";

/**
 * Mapa `module:actionName -> função que refaz a ação de verdade no
 * servidor`, usado pelo motor de sincronização (`sync-engine.ts`) ao
 * reconectar. Cada módulo que quiser suportar criação offline registra
 * aqui a versão "sem redirect, aceita id" da própria action (ver
 * `modules/clientes/actions.ts#createCustomerRecord` — é o padrão a
 * repetir nos próximos módulos: veiculos, catalogo, ordens).
 *
 * Fica em `core/` (não dentro de um módulo) porque PRECISA conhecer
 * vários módulos pra funcionar — é a composição, igual
 * `core/load-modules.ts` já faz com os `module.ts` de cada um.
 */
export const REPLAY_HANDLERS: Record<
  string,
  (record: Record<string, unknown>, id: string) => Promise<{ ok: boolean; message?: string }>
> = {
  "clientes:createCustomer": (record, id) => createCustomerRecord(record as CustomerInput, id),
};
