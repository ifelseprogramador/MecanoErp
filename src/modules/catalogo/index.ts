/**
 * API pública do módulo `catalogo`. `ordens` (o editor de itens da OS)
 * importa `searchCatalogItems`/`CatalogItem` daqui, nunca de
 * `schema.ts`/`queries.ts` diretamente.
 */
export type { CatalogItem } from "./schema.types";
export { listCatalogItemsForSelect, searchCatalogItems } from "./queries";
