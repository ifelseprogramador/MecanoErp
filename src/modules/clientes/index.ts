/**
 * API pública do módulo `clientes` — o único ponto que outro módulo pode
 * importar (nunca `schema.ts`/`actions.ts`/etc. diretamente). Hoje só
 * reexporta o tipo; quando `ordens` precisar de um seletor de cliente,
 * a query correspondente é adicionada aqui.
 */
export type { Customer } from "./schema.types";
