import { sql } from "drizzle-orm";
import { db } from "@/core/db";
import { logger } from "@/core/logger";

/**
 * Health check simples: confirma que a aplicação sobe e que o banco
 * responde. Útil para saber na hora se uma queda é da app ou do Supabase.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", database: "ok" });
  } catch (err) {
    logger.error("health.db_falhou", { err });
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
