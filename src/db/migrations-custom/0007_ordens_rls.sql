-- RLS de "work_orders" e "work_order_counters" (têm organization_id
-- direto) — ver apply_org_rls() em 0001_rls_policies.sql.
select public.apply_org_rls('work_orders');
select public.apply_org_rls('work_order_counters');

-- "work_order_items" não tem organization_id próprio (só work_order_id) —
-- não dá pra usar apply_org_rls(). Policy própria via join com
-- work_orders, mesmo espírito (select/insert/update/delete restritos à
-- organização do usuário autenticado).
alter table "work_order_items" enable row level security;

create policy "work_order_items_select_own_org" on "work_order_items"
  for select to authenticated
  using (
    work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  );

create policy "work_order_items_insert_own_org" on "work_order_items"
  for insert to authenticated
  with check (
    work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  );

create policy "work_order_items_update_own_org" on "work_order_items"
  for update to authenticated
  using (
    work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  )
  with check (
    work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  );

create policy "work_order_items_delete_own_org" on "work_order_items"
  for delete to authenticated
  using (
    work_order_id in (
      select id from work_orders where organization_id in (select public.current_org_ids())
    )
  );
