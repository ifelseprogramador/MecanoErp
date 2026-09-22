-- RLS de platform_admins e organization_module_settings — defesa em
-- profundidade, não a proteção ativa (ver docs/decisoes.md, "bypassrls").
--
-- Nenhuma das duas ganha policy: sem policy + RLS habilitada = bloqueada
-- por padrão para os papéis `anon`/`authenticated`. A área /admin só
-- acessa essas tabelas pela conexão da aplicação (papel `postgres`, que
-- ignora RLS), sempre atrás de `requireAdmin()`.

alter table "platform_admins" enable row level security;
alter table "organization_module_settings" enable row level security;

-- FK lógica para auth.users, mesmo padrão de memberships (0001).
alter table "platform_admins"
  add constraint "platform_admins_user_id_auth_users_id_fk"
  foreign key ("user_id") references auth.users(id) on delete cascade;
