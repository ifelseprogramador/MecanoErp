"use client";

import { createCustomerRecord } from "@/modules/clientes/actions";
import type { CustomerInput } from "@/modules/clientes/validation";
import { createVehicleRecord } from "@/modules/veiculos/actions";
import type { VehicleInput } from "@/modules/veiculos/validation";
import { createCatalogItemRecord } from "@/modules/catalogo/actions";
import type { CatalogItemInput } from "@/modules/catalogo/validation";
import { createWorkOrderRecord } from "@/modules/ordens/actions";
import type { WorkOrderHeaderInput } from "@/modules/ordens/validation";

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
  "veiculos:createVehicle": (record, id) => createVehicleRecord(record as VehicleInput, id),
  "catalogo:createCatalogItem": (record, id) =>
    createCatalogItemRecord(record as CatalogItemInput, id),
  "ordens:createWorkOrder": (record, id) =>
    createWorkOrderRecord(record as WorkOrderHeaderInput, id),
};
