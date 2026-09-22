/**
 * Cria a primeira organização e o primeiro usuário (owner). Roda com
 * `npm run db:seed`, depois de `npm run db:migrate`. Idempotente: rodar de
 * novo não duplica organização nem usuário.
 *
 * Usa a service role key do Supabase (bypassa RLS e confirmação de
 * e-mail) — nunca rode este script fora de um ambiente que você controla.
 */
import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { requireEnv } from "@/core/env";
import * as schema from "@/db/schema";
import { memberships, organizations } from "@/db/schema";

async function main() {
  const orgName = process.env.SEED_ORG_NAME || "Oficina Exemplo";
  const ownerEmail = requireEnv("SEED_OWNER_EMAIL");
  const ownerPassword = requireEnv("SEED_OWNER_PASSWORD");

  const sql = postgres(requireEnv("DATABASE_URL"), { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  const supabaseAdmin = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );

  console.log(`[seed] garantindo organização "${orgName}"...`);
  let [org] = await db.select().from(organizations).where(eq(organizations.name, orgName));
  if (!org) {
    [org] = await db.insert(organizations).values({ name: orgName }).returning();
    console.log(`[seed] organização criada: ${org.id}`);
  } else {
    console.log(`[seed] organização já existia: ${org.id}`);
  }

  console.log(`[seed] garantindo usuário ${ownerEmail}...`);
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  let user = existingUsers.users.find((u) => u.email === ownerEmail);
  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`[seed] usuário criado: ${user.id}`);
  } else {
    console.log(`[seed] usuário já existia: ${user.id}`);
  }

  const [existingMembership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id));

  if (!existingMembership) {
    await db.insert(memberships).values({
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    });
    console.log(`[seed] membership criado: ${user.id} -> ${org.id} (owner)`);
  } else {
    console.log("[seed] membership já existia");
  }

  console.log("[seed] concluído. Login:", ownerEmail);
  await sql.end();
}

main().catch((err) => {
  console.error("[seed] falhou:", err);
  process.exit(1);
});
