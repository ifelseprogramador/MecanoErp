-- RLS vira a proteção ATIVA (antes era só defesa em profundidade — ver
-- docs/decisoes.md, "bypassrls", e a nova entrada sobre esta migration).
-- A conexão da aplicação passa a usar um papel Postgres sem `bypassrls`
-- (ver 0011_app_role.sql) — esta migration prepara as funções/policies
-- pra esse papel antes da troca, sem quebrar nada enquanto a conexão
-- ainda usa o papel antigo (`postgres`, que ignora RLS de qualquer jeito
-- até 0011 entrar em vigor via troca de `DATABASE_URL`).
--
-- Referência: mesmo padrão já validado em produção no BaseERP/Prisma —
-- `base-erp/src/db/migrations-custom/0001_rls_policies.sql` e
-- `0002_platform_admin_rls.sql`.

-- 1) Usuário "atual" via variável de sessão própria, nunca `auth.uid()`
-- (que só resolve dentro do Data API/PostgREST do Supabase — uma conexão
-- direta via `postgres-js`, como a nossa, nunca populariza esse
-- contexto). Definida por `core/db.ts#runWithUserContext` no início de
-- cada transação de request via `set_config('app.current_user_id', ..., true)`.
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

grant execute on function public.current_app_user_id() to authenticated;

-- 2) `current_org_ids()` passa a ler `current_app_user_id()` em vez de
-- `auth.uid()`. Como é `create or replace`, toda policy que já chama
-- esta função (as 4 de cada tabela coberta por `apply_org_rls()` desde
-- 0002 a 0008) passa a usar a nova fonte automaticamente, sem precisar
-- recriar essas policies uma a uma.
create or replace function public.current_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from memberships where user_id = public.current_app_user_id()
$$;

-- 3) Nova: "esse usuário é o dono da plataforma?" — SECURITY DEFINER pra
-- não cair em recursão quando a própria `platform_admins` também tem RLS
-- habilitada (a policy dela chamaria esta função, que consultaria
-- `platform_admins`, que checaria a policy dela...). `app.is_system`
-- cobre código sem sessão de usuário (nenhum hoje no mecano-erp, mas
-- mantido pro mesmo padrão do BaseERP caso um cron precise no futuro).
create or replace function public.is_current_user_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(current_setting('app.is_system', true), '') = 'true'
    or exists (
      select 1 from platform_admins where user_id = public.current_app_user_id()
    )
$$;

grant execute on function public.is_current_user_platform_admin() to authenticated;

-- 4) `apply_org_rls()` ganha `or public.is_current_user_platform_admin()`
-- em cada uma das 4 policies — mas policies JÁ CRIADAS por chamadas
-- antigas desta função não absorvem a mudança sozinhas (o texto da
-- policy foi gravado no momento da criação). Por isso, depois de
-- redefinir a função, as seções abaixo derrubam e recriam as policies de
-- toda tabela que já usa `apply_org_rls()`.
create or replace function public.apply_org_rls(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('alter table %I enable row level security', table_name);
  execute format(
    'create policy %I on %I for select to authenticated using (organization_id in (select public.current_org_ids()) or public.is_current_user_platform_admin())',
    table_name || '_select_own_org', table_name
  );
  execute format(
    'create policy %I on %I for insert to authenticated with check (organization_id in (select public.current_org_ids()) or public.is_current_user_platform_admin())',
    table_name || '_insert_own_org', table_name
  );
  execute format(
    'create policy %I on %I for update to authenticated using (organization_id in (select public.current_org_ids()) or public.is_current_user_platform_admin()) with check (organization_id in (select public.current_org_ids()) or public.is_current_user_platform_admin())',
    table_name || '_update_own_org', table_name
  );
  execute format(
    'create policy %I on %I for delete to authenticated using (organization_id in (select public.current_org_ids()) or public.is_current_user_platform_admin())',
    table_name || '_delete_own_org', table_name
  );
end;
$$;

-- 5) Recria as policies das tabelas já cobertas por `apply_org_rls()`
-- (0002, 0003, 0005, 0006, 0007, 0008) com a versão nova da função —
-- drop + select apply_org_rls(...) de novo, idempotente.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers',
    'vehicles',
    'live_sessions',
    'catalog_items',
    'work_orders',
    'work_order_counters',
    'organization_backup_settings',
    'organization_backups'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_select_own_org', t);
    execute format('drop policy if exists %I on %I', t || '_insert_own_org', t);
    execute format('drop policy if exists %I on %I', t || '_update_own_org', t);
    execute format('drop policy if exists %I on %I', t || '_delete_own_org', t);
    perform public.apply_org_rls(t);
  end loop;
end $$;

-- 6) `organizations`/`memberships` (0001): policies próprias, não geradas
-- por `apply_org_rls()` — recriar com admin-OR e acrescentar policy de
-- escrita pro admin (antes não existia nenhuma; criar/editar organização
-- e membership era só possível via conexão que ignorava RLS).
drop policy if exists "organizations_select_own" on "organizations";
create policy "organizations_select_own" on "organizations"
  for select to authenticated
  using (id in (select public.current_org_ids()) or public.is_current_user_platform_admin());

create policy "organizations_admin_write" on "organizations"
  for all to authenticated
  using (public.is_current_user_platform_admin())
  with check (public.is_current_user_platform_admin());

-- Dono (role='owner') da organização edita a PRÓPRIA cor/logo via
-- `/perfil` (`core/profile/actions.ts#updateOrganizationBranding`/
-- `#resetOrganizationColor`) — primeira vez que alguém que NÃO é
-- platform admin escreve em `organizations`. Sem isso, esse UPDATE bate
-- em 0 linhas (RLS bloqueia silenciosamente) assim que a conexão da
-- app deixar de ter `bypassrls` — mesmo bug real já encontrado e
-- corrigido no BaseERP/Prisma nesta sessão (ver docs/decisoes.md),
-- corrigido aqui ANTES de acontecer em produção, não depois.
--
-- Não dá pra restringir por COLUNA só com GRANT: é o mesmo papel de
-- banco que atende admin e owner comum. Por isso duas peças: uma policy
-- de UPDATE restrita a quem é owner da própria organização
-- (`current_owner_org_ids()`, abaixo — `current_org_ids()` não filtra
-- por role, um staff também apareceria), e um trigger que rejeita
-- qualquer mudança fora de `primary_color`/`sidebar_color`/`logo_url`/
-- `updated_at` quando quem edita não é platform admin.
create or replace function public.current_owner_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from memberships
  where user_id = public.current_app_user_id() and role = 'owner'
$$;

grant execute on function public.current_owner_org_ids() to authenticated;

create policy "organizations_owner_update_branding" on "organizations"
  for update to authenticated
  using (id in (select public.current_owner_org_ids()))
  with check (id in (select public.current_owner_org_ids()));

create or replace function public.restrict_organization_branding_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_current_user_platform_admin() then
    return new;
  end if;

  if new.name is distinct from old.name
    or new.document is distinct from old.document
    or new.phone is distinct from old.phone
    or new.address is distinct from old.address
    or new.status is distinct from old.status
    or new.billing_status is distinct from old.billing_status
    or new.next_due_date is distinct from old.next_due_date
    or new.billing_notes is distinct from old.billing_notes
  then
    raise exception 'Só o dono da plataforma pode alterar esses campos.';
  end if;

  return new;
end;
$$;

create trigger organizations_restrict_branding_update
  before update on "organizations"
  for each row
  execute function public.restrict_organization_branding_update();

drop policy if exists "memberships_select_own_org" on "memberships";
create policy "memberships_select_own_org" on "memberships"
  for select to authenticated
  using (organization_id in (select public.current_org_ids()) or public.is_current_user_platform_admin());

create policy "memberships_admin_write" on "memberships"
  for all to authenticated
  using (public.is_current_user_platform_admin())
  with check (public.is_current_user_platform_admin());

-- 7) `platform_admins`/`organization_module_settings` (0004): RLS já
-- habilitada, mas SEM NENHUMA policy até aqui — bloqueada por padrão
-- pra `authenticated`/`anon`. Só funcionava porque a conexão do app
-- ignorava RLS (`bypassrls`). Agora precisa de policy de verdade.
create policy "platform_admins_admin_rw" on "platform_admins"
  for all to authenticated
  using (public.is_current_user_platform_admin())
  with check (public.is_current_user_platform_admin());

-- Bootstrap do primeiro admin: se a tabela ainda está vazia, qualquer
-- usuário autenticado pode se auto-inserir uma única vez (fluxo de setup
-- inicial via script/seed com a própria conta). Depois que existir ao
-- menos um admin, o `not exists` fica falso e nunca mais libera nada —
-- admin novo precisa ser adicionado por um admin existente (coberto pela
-- policy acima).
create policy "platform_admins_bootstrap_insert" on "platform_admins"
  for insert to authenticated
  with check (not exists (select 1 from platform_admins));

select public.apply_org_rls('organization_module_settings');

-- 8) `audit_log` (0005): antes sem policy nenhuma (só legível via
-- conexão que ignorava RLS). Fica admin-only pra leitura/edição/remoção
-- — mas GANHA uma policy de INSERT liberando a própria organização (só
-- pra registrar a PRÓPRIA autoria, nunca outra pessoa): várias ações de
-- auditoria são iniciadas pela organização, não só pelo admin (ver
-- `core/live-support/actions.ts`, que chama `recordAudit` em
-- solicitar/chamar/aprovar/recusar). Mesmo bug real já encontrado e
-- corrigido no BaseERP (ver `base-erp/src/db/migrations-custom/0006_user_display_lookup_and_audit_insert.sql`)
-- — replicado aqui de propósito, sem esperar acontecer de novo.
create policy "audit_log_admin_only" on "audit_log"
  for all to authenticated
  using (public.is_current_user_platform_admin())
  with check (public.is_current_user_platform_admin());

create policy "audit_log_insert_own_org" on "audit_log"
  for insert to authenticated
  with check (
    organization_id in (select public.current_org_ids())
    and actor_user_id = public.current_app_user_id()
  );

-- 9) `work_order_items` (0007): policies manuais (não usam
-- `apply_org_rls()`, porque a tabela não tem `organization_id` próprio —
-- só `work_order_id`, RLS via join). Recriar com admin-OR.
drop policy if exists "work_order_items_select_own_org" on "work_order_items";
drop policy if exists "work_order_items_insert_own_org" on "work_order_items";
drop policy if exists "work_order_items_update_own_org" on "work_order_items";
drop policy if exists "work_order_items_delete_own_org" on "work_order_items";

create policy "work_order_items_select_own_org" on "work_order_items"
  for select to authenticated
  using (
    public.is_current_user_platform_admin()
    or work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  );

create policy "work_order_items_insert_own_org" on "work_order_items"
  for insert to authenticated
  with check (
    public.is_current_user_platform_admin()
    or work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  );

create policy "work_order_items_update_own_org" on "work_order_items"
  for update to authenticated
  using (
    public.is_current_user_platform_admin()
    or work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  )
  with check (
    public.is_current_user_platform_admin()
    or work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  );

create policy "work_order_items_delete_own_org" on "work_order_items"
  for delete to authenticated
  using (
    public.is_current_user_platform_admin()
    or work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  );

-- 10) `notifications`/`notification_reads` (0008/0009): recriar
-- `notifications_select` com admin-OR e acrescentar policy de escrita
-- pro admin (antes só a conexão bypassrls criava/editava/apagava
-- notificações). `notification_reads_update` (0009) trocado de
-- `user_id = auth.uid()` pra `public.current_app_user_id()`.
drop policy if exists "notifications_select" on "notifications";
create policy "notifications_select" on "notifications"
  for select
  using (
    organization_id is null
    or organization_id in (select public.current_org_ids())
    or public.is_current_user_platform_admin()
  );

create policy "notifications_admin_write" on "notifications"
  for all to authenticated
  using (public.is_current_user_platform_admin())
  with check (public.is_current_user_platform_admin());

drop policy if exists "notification_reads_select" on "notification_reads";
create policy "notification_reads_select" on "notification_reads"
  for select
  using (
    organization_id in (select public.current_org_ids())
    or public.is_current_user_platform_admin()
  );

drop policy if exists "notification_reads_insert" on "notification_reads";
create policy "notification_reads_insert" on "notification_reads"
  for insert
  with check (
    organization_id in (select public.current_org_ids())
    or public.is_current_user_platform_admin()
  );

drop policy if exists "notification_reads_update" on "notification_reads";
create policy "notification_reads_update" on "notification_reads"
  for update
  using (
    (
      organization_id in (select public.current_org_ids())
      and user_id = public.current_app_user_id()
    )
    or public.is_current_user_platform_admin()
  )
  with check (
    (
      organization_id in (select public.current_org_ids())
      and user_id = public.current_app_user_id()
    )
    or public.is_current_user_platform_admin()
  );

-- 11) `auth.users` tem RLS própria do Supabase, fora do controle deste
-- projeto — um `select` direto nela pelo papel da aplicação (sem
-- `bypassrls`) sempre devolve 0 linhas, mesmo pra um platform admin.
-- `core/user-lookup.ts#getUserDisplayInfoByIds` (usado em "Pessoas com
-- acesso"/histórico de auditoria/"quem leu" de notificação) precisa
-- atravessar essa RLS de propósito via uma função SECURITY DEFINER, que
-- só devolve linha se quem chamou for platform admin (checado DENTRO da
-- função). Mesmo padrão já validado no BaseERP/Prisma
-- (`base-erp/src/db/migrations-custom/0006_user_display_lookup_and_audit_insert.sql`).
create or replace function public.get_user_display_info(user_ids uuid[])
returns table (id uuid, email text, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email, u.raw_user_meta_data->>'display_name' as display_name
  from auth.users u
  where u.id = any(user_ids)
    and public.is_current_user_platform_admin()
$$;

grant execute on function public.get_user_display_info(uuid[]) to authenticated;
