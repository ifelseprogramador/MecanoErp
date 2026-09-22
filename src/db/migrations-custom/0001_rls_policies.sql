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
