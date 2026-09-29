/**
 * Teste de integração de isolamento por RLS — prova, com um client
 * Postgres DIRETO (pacote `postgres`, sem passar por `withOrg()`/
 * Drizzle), que a migração pra RLS ativa (ver docs/decisoes.md,
 * "Migração pra RLS ativa") isola de verdade uma organização da outra.
 * Mesmo padrão já validado em produção no BaseERP/Prisma.
 *
 * Usuários de teste são criados via Admin API do Supabase
 * (`supabaseAdmin.auth.admin.createUser`), nunca por insert direto em
 * `auth.users` (um Supabase real recusa esse insert).
 *
 * Como rodar de verdade (contra o Supabase real do mecano-erp):
 *   1. Aplique as migrations: `npm run db:migrate` (`0010_rls_ativa.sql`
 *      + `0011_app_role.sql`, que cria o papel `mecano_erp_app`).
 *   2. Defina uma senha pro papel `mecano_erp_app` (ver README).
 *   3. Rode com as 3 env vars abaixo apontando pro papel `mecano_erp_app`
 *      (NUNCA `postgres`/o papel privilegiado — senão o teste "passa"
 *      mesmo com RLS quebrada, porque dono de tabela ignora RLS):
 *      `DATABASE_URL=postgresql://mecano_erp_app.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:6543/postgres \
 *       NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *       npx vitest run rls-isolation`
 *
 * Sem as 3 variáveis no ambiente, o teste é pulado — nunca falha por
 * falta de infraestrutura, mas também nunca finge ter passado (ver
 * `describe.skipIf` abaixo).
 *
 * Cria e apaga usuários/organizações de teste (sufixo `RLS Test Org`)
 * no projeto apontado — mecano-erp É um sistema em produção com dados
 * reais de oficinas, então este teste só toca as próprias fixtures que
 * cria (nunca lê/apaga nada preexistente) e o `afterAll` limpa tudo,
 * mesmo se uma asserção falhar no meio (`afterAll` do Vitest roda de
 * qualquer jeito).
 */
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = Boolean(DATABASE_URL && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!canRun)("isolamento por RLS entre organizações", () => {
  let sql: postgres.Sql;
  let orgAId: string;
  let orgBId: string;
  let adminUserId: string;
  let userAId: string;
  let userBId: string;
  let customerAId: string;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL!, { prepare: false });
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const suffix = Date.now();

    // `adminUserId` é um usuário à parte, só pro bootstrap (insert de
    // organizations/memberships exige contexto de admin) — CRÍTICO: não
    // pode ser o mesmo usuário usado nas asserções de isolamento, senão
    // o teste "passaria" mesmo com RLS quebrada (admin enxerga tudo por
    // desenho).
    const createUser = async (email: string) => {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: "Teste123!Descartavel",
        email_confirm: true,
      });
      if (error) throw error;
      return data.user!.id;
    };

    adminUserId = await createUser(`rls-test-admin-${suffix}@example.com`);
    userAId = await createUser(`rls-test-a-${suffix}@example.com`);
    userBId = await createUser(`rls-test-b-${suffix}@example.com`);

    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${adminUserId}, true)`;
      await tx`insert into platform_admins (user_id) values (${adminUserId}) on conflict do nothing`;
    });

    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${adminUserId}, true)`;
      const [orgA] =
        await tx`insert into organizations (name) values (${"RLS Test Org A " + suffix}) returning id`;
      const [orgB] =
        await tx`insert into organizations (name) values (${"RLS Test Org B " + suffix}) returning id`;
      orgAId = orgA.id;
      orgBId = orgB.id;
      await tx`insert into memberships (user_id, organization_id, role) values (${userAId}, ${orgAId}, 'owner')`;
      await tx`insert into memberships (user_id, organization_id, role) values (${userBId}, ${orgBId}, 'owner')`;
    });

    // Um cliente de negócio na organização A — prova que `apply_org_rls()`
    // (não só as policies escritas à mão de organizations/memberships)
    // também isola de verdade.
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${userAId}, true)`;
      const [customer] =
        await tx`insert into customers (organization_id, name, type) values (${orgAId}, ${"RLS Test Customer " + suffix}, 'pf') returning id`;
      customerAId = customer.id;
    });
  });

  afterAll(async () => {
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    // Bug real encontrado rodando isto pela primeira vez contra o Supabase
    // de produção do mecano-erp: sem `set_config('app.current_user_id', ...)`
    // antes de cada delete, a RLS (agora ativa) bloqueia SILENCIOSAMENTE
    // a própria limpeza (0 linhas afetadas, sem erro) — as fixtures de
    // teste ficavam órfãs em produção. Precisa do contexto do admin
    // (`adminUserId`) pra `is_current_user_platform_admin()` liberar.
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${adminUserId}, true)`;
      await tx`delete from customers where id = ${customerAId}`;
      await tx`delete from memberships where organization_id in (${orgAId}, ${orgBId})`;
      await tx`delete from organizations where id in (${orgAId}, ${orgBId})`;
      await tx`delete from platform_admins where user_id = ${adminUserId}`;
    });
    await sql.end();
    await Promise.all(
      [adminUserId, userAId, userBId].map((id) => supabaseAdmin.auth.admin.deleteUser(id)),
    );
  });

  it("usuário da organização A não enxerga a organização B", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${userAId}, true)`;
      return tx`select id, name from organizations where id in (${orgAId}, ${orgBId}) order by name`;
    });

    expect(rows.map((r) => r.id)).toContain(orgAId);
    expect(rows.map((r) => r.id)).not.toContain(orgBId);
  });

  it("usuário da organização A não enxerga memberships da organização B", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${userAId}, true)`;
      return tx`select organization_id from memberships where organization_id in (${orgAId}, ${orgBId})`;
    });

    expect(rows.every((r) => r.organization_id === orgAId)).toBe(true);
  });

  it("usuário da organização B não enxerga clientes da organização A", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${userBId}, true)`;
      return tx`select id from customers where id = ${customerAId}`;
    });

    expect(rows).toHaveLength(0);
  });

  it("sem `app.current_user_id` definido, nenhuma organização é visível", async () => {
    const rows = await sql`select id from organizations where id in (${orgAId}, ${orgBId})`;
    expect(rows).toHaveLength(0);
  });
});
