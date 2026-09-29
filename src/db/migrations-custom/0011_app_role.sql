-- Papel de conexão da APLICAÇÃO em runtime, separado do papel usado para
-- rodar migrations (o que está em `DATABASE_URL` hoje, `postgres`/o dono
-- do projeto Supabase, que tem `bypassrls` por padrão). Necessário pra
-- RLS virar a proteção ATIVA (ver docs/decisoes.md, "Migração pra RLS
-- ativa"): dono de tabela e superusuário sempre ignoram RLS, com ou sem
-- `bypassrls`, a não ser que a tabela use `FORCE ROW LEVEL SECURITY` — e
-- forçar RLS no dono quebraria as funções SECURITY DEFINER
-- (`current_org_ids()`, `is_current_user_platform_admin()`,
-- `get_user_display_info()`, ver 0010_rls_ativa.sql), que PRECISAM rodar
-- como o dono/privilegiado para evitar recursão infinita ao consultar
-- `memberships`/`platform_admins` por dentro.
--
-- Por isso: as migrations (esta incluída) rodam com o papel privilegiado
-- (via `DATABASE_MIGRATION_URL`), mas a APLICAÇÃO EM PRODUÇÃO deve trocar
-- `DATABASE_URL` para conectar como `mecano_erp_app` (sem bypassrls, sem
-- ser dono de nada) — ver docs/decisoes.md e README.md. ATÉ essa troca de
-- `DATABASE_URL` acontecer, o app continua rodando exatamente como antes
-- (papel `postgres`, RLS só como defesa em profundidade) — esta migration
-- sozinha não muda nada em produção.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mecano_erp_app') then
    create role mecano_erp_app with login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;
  end if;
end
$$;

grant usage on schema public to mecano_erp_app;
grant select, insert, update, delete on all tables in schema public to mecano_erp_app;
alter default privileges in schema public
  grant select, insert, update, delete on tables to mecano_erp_app;
grant usage on all sequences in schema public to mecano_erp_app;
alter default privileges in schema public grant usage on sequences to mecano_erp_app;

-- Precisa ser reconhecido como o mesmo "grupo" que as policies
-- endereçam com `to authenticated` (ver 0010_rls_ativa.sql), e ter
-- select em `auth.users` como base — mesmo as funções SECURITY DEFINER
-- (que rodam com o privilégio do dono, não do caller) dependem de um
-- GRANT básico existir na cadeia de permissões do schema `auth`.
grant authenticated to mecano_erp_app;
grant usage on schema auth to mecano_erp_app;
grant select on auth.users to mecano_erp_app;
