-- CORREÇÃO da 0014: ela copiou o gatilho do BaseERP, que compara
-- `new.business_type`. A tabela `organizations` do mecano-erp NÃO tem essa
-- coluna, então todo UPDATE feito por quem não é admin da plataforma (logo,
-- cores, dados da oficina) falhava com 'record "new" has no field
-- "business_type"'. Esta versão não menciona `business_type`.
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
