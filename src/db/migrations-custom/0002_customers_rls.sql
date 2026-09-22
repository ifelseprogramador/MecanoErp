-- RLS de "customers" (módulo clientes). Mesmo padrão a seguir em toda
-- migration de módulo novo — ver apply_org_rls() em 0001_rls_policies.sql.
select public.apply_org_rls('customers');
