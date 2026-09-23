-- RLS de organization_backup_settings/organization_backups (mesmo
-- padrão de sempre) e notifications/notification_reads (também
-- organization_id, mesmo quando notifications.organization_id é nulo —
-- "pra todo mundo" — apply_org_rls() cobre isso: null nunca bate no IN
-- (...), então a policy padrão bloquearia mensagens "pra todos" pro
-- usuário comum. Por isso notifications/notification_reads usam
-- policies próprias, escritas à mão, em vez de apply_org_rls().
select public.apply_org_rls('organization_backup_settings');
select public.apply_org_rls('organization_backups');

alter table "notifications" enable row level security;
alter table "notification_reads" enable row level security;

-- Leitura: notificações "pra todos" (organization_id nulo) OU só da
-- própria organização. Sem policy de insert/update/delete pra usuário
-- comum — só quem tem acesso de admin (bypassrls, ver docs/decisoes.md
-- "bypassrls") cria/edita/apaga.
create policy "notifications_select" on "notifications"
  for select
  using (organization_id is null or organization_id in (select public.current_org_ids()));

create policy "notification_reads_select" on "notification_reads"
  for select
  using (organization_id in (select public.current_org_ids()));

create policy "notification_reads_insert" on "notification_reads"
  for insert
  with check (organization_id in (select public.current_org_ids()));

-- notification_reads.user_id e notifications.created_by referenciam
-- auth.users, fora do schema do Drizzle (mesmo padrão de memberships,
-- ver 0001_rls_policies.sql).
alter table "notification_reads"
  add constraint "notification_reads_user_id_auth_users_id_fk"
  foreign key ("user_id") references auth.users(id) on delete cascade;

alter table "notifications"
  add constraint "notifications_created_by_auth_users_id_fk"
  foreign key ("created_by") references auth.users(id) on delete cascade;
