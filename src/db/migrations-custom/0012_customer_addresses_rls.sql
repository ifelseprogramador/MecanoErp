-- RLS da tabela de endereços de cliente (campos fiscais, NF-e/NFS-e).
select public.apply_org_rls('customer_addresses');
