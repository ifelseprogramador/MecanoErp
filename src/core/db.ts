import { drizzle } from "drizzle-orm/postgres-js";
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

export const db = drizzle(client, { schema });

export type Database = typeof db;
