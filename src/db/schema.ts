/**
 * Ponto único que o drizzle-kit lê para gerar migrations. Reexporta o
 * schema de cada módulo — nunca declare tabelas aqui diretamente.
 *
 * Ordem de dependência (FKs apontam para cima nesta lista):
 *   tenancy -> clientes -> veiculos -> catalogo -> ordens -> agenda -> financeiro
 */

export * from "./schema/tenancy";
export * from "@/modules/clientes/schema";
export * from "@/modules/veiculos/schema";
