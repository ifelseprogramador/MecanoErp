/**
 * API pública do módulo `clientes` — o único ponto que outro módulo pode
 * importar (nunca `schema.ts`/`actions.ts`/etc. diretamente).
 */
export type { Customer } from "./schema.types";
export {
  findCustomerByDocumentOrName,
  getCustomerDashboardSummary,
  listCustomersForSelect,
} from "./queries";
