-- Migration custom (fora do drizzle-kit, que não modela `auth.users` nem
-- RLS). Roda depois de 0000_*.sql — ver src/db/migrate.ts.
--
-- Padrão a seguir em TODA tabela de negócio nova (clientes, veículos,
-- ordens...): tem `organization_id`, tem RLS habilitada, e as 4 policies
-- abaixo trocando "memberships"/"organizations" pelo nome da tabela.

-- memberships.user_id referencia auth.users, que vive fora do schema
-- público e não é modelado pelo Drizzle.
alter table "memberships"
  add constraint "memberships_user_id_auth_users_id_fk"
  foreign key ("user_id") references auth.users(id) on delete cascade;

-- Função auxiliar: organizações do usuário autenticado. SECURITY DEFINER é
-- necessário para não cair em recursão infinita quando a própria tabela
-- `memberships` também tem RLS habilitada (a policy de memberships chama
-- esta função, que por sua vez consulta memberships ignorando RLS).
create or replace function public.current_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from memberships where user_id = auth.uid()
$$;

grant execute on function public.current_org_ids() to authenticated;

-- Helper para não reescrever as mesmas 4 policies em toda migration de
-- módulo novo: habilita RLS numa tabela com `organization_id` e cria as
-- policies de select/insert/update/delete restritas a
-- `current_org_ids()`. Uso (numa migration custom nova):
--   select public.apply_org_rls('nome_da_tabela');
create or replace function public.apply_org_rls(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('alter table %I enable row level security', table_name);
  execute format(
    'create policy %I on %I for select to authenticated using (organization_id in (select public.current_org_ids()))',
    table_name || '_select_own_org', table_name
  );
  execute format(
    'create policy %I on %I for insert to authenticated with check (organization_id in (select public.current_org_ids()))',
    table_name || '_insert_own_org', table_name
  );
  execute format(
    'create policy %I on %I for update to authenticated using (organization_id in (select public.current_org_ids())) with check (organization_id in (select public.current_org_ids()))',
    table_name || '_update_own_org', table_name
  );
  execute format(
    'create policy %I on %I for delete to authenticated using (organization_id in (select public.current_org_ids()))',
    table_name || '_delete_own_org', table_name
  );
end;
$$;

alter table "organizations" enable row level security;
alter table "memberships" enable row level security;

create policy "organizations_select_own" on "organizations"
  for select to authenticated
  using (id in (select public.current_org_ids()));

create policy "memberships_select_own_org" on "memberships"
  for select to authenticated
  using (organization_id in (select public.current_org_ids()));

-- Sem policies de insert/update/delete de propósito: com RLS habilitada e
-- nenhuma policy para essas operações, elas ficam bloqueadas para o papel
-- `authenticated`. No MVP, criar organização/membership é feito pelo
-- script de seed com a service role key (que ignora RLS). Quando houver
-- convite de usuários (fase SaaS), adicionar policies de insert aqui.
