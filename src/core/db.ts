import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não configurada. Copie .env.example para .env.local e preencha com a " +
      "connection string do Supabase (Project Settings -> Database -> Connection string -> URI, " +
      "usando o pooler em modo 'Transaction').",
  );
}

// `prepare: false` é exigido pelo pooler em modo transaction do Supabase
// (pgbouncer), que não suporta prepared statements entre conexões.
const client = postgres(connectionString, { prepare: false });

/**
 * Conexão única da aplicação. Desde a migração pra RLS ativa (ver
 * docs/decisoes.md), o papel Postgres por trás de `DATABASE_URL` NÃO tem
 * `bypassrls` — `db.select()...` chamado direto, fora de
 * `runWithUserContext`/`withOrg`/`requireAdmin`, sempre volta vazio para
 * qualquer tabela com `apply_org_rls()` aplicado — falha fechado por
 * padrão, nunca vaza dado de outra organização por esquecimento de um
 * filtro manual (que continua existindo, como defesa em profundidade
 * adicional — nunca remover o `eq(tabela.organizationId, ...)` das
 * queries por causa da RLS).
 */
export const db = drizzle(client, { schema });

export type Database = typeof db;

/**
 * Roda `fn` dentro de uma transação com `app.current_user_id` definido via
 * `set_config(..., true)` (terceiro argumento `true` = `is_local`: some
 * sozinho ao fim da transação, não vaza para a próxima query que reusar a
 * mesma conexão física do pool). As funções SQL `current_org_ids()` e
 * `is_current_user_platform_admin()` (ver
 * src/db/migrations-custom/0010_rls_ativa.sql) leem essa variável para
 * decidir o que a RLS libera.
 *
 * Este é o ÚNICO jeito sancionado de consultar tabelas com RLS habilitada
 * — nunca chame `db.select()` direto para dado de organização. Ver
 * `core/auth.ts#withOrg` e `core/admin-auth.ts#requireAdmin`, que expõem
 * isso como `withDb(fn)` já amarrado ao usuário da sessão atual.
 */
export async function runWithUserContext<T>(
  userId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
    return fn(tx as unknown as Database);
  });
}

/**
 * Mesma ideia de `runWithUserContext`, mas para código de sistema sem
 * sessão de usuário nenhuma (nenhum caso hoje no mecano-erp, mantido pelo
 * mesmo motivo do BaseERP: um cron futuro sem sessão de usuário precisaria
 * do mesmo acesso "enxerga tudo" que um admin tem). NUNCA chame isto a
 * partir de código alcançável por uma requisição de usuário comum.
 */
export async function runWithSystemContext<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.is_system', 'true', true)`);
    return fn(tx as unknown as Database);
  });
}
