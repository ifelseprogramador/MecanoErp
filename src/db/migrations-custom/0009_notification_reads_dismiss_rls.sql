-- Apagar notificação do próprio sino = upsert em notification_reads
-- preenchendo dismissed_at (ver schema/notifications.ts). O upsert
-- (`on conflict do update`) exige policy de UPDATE sob RLS — e só na
-- linha da própria pessoa, nunca na de outra da mesma oficina.
create policy "notification_reads_update" on "notification_reads"
  for update
  using (
    organization_id in (select public.current_org_ids())
    and user_id = auth.uid()
  )
  with check (
    organization_id in (select public.current_org_ids())
    and user_id = auth.uid()
  );
