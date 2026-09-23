/**
 * API pública do módulo `veiculos`. `ordens` (Fase 3) importa
 * `listVehiclesByCustomer`/`Vehicle` daqui, nunca de `schema.ts`/`queries.ts`
 * diretamente.
 */
export type { Vehicle } from "./schema.types";
export { listVehiclesByCustomer, listVehiclesForSelect } from "./queries";
