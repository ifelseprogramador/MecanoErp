-- RLS de audit_log e live_sessions — defesa em profundidade, não a
-- proteção ativa (ver docs/decisoes.md, "bypassrls"). A conexão do app
-- (papel `postgres`) ignora RLS; a proteção real de audit_log é nunca ser
-- lida fora de core/admin/audit.ts (atrás de requireAdmin()), e a de
-- live_sessions é toda action em core/live-support/actions.ts checar
-- explicitamente organização/participante antes de mexer numa linha.

alter table "audit_log" enable row level security;
alter table "live_sessions" enable row level security;

select public.apply_org_rls('live_sessions');

-- audit_log não tem policy nenhuma de propósito: nem membro de
-- organização deveria conseguir ler via um caminho que respeite RLS (só
-- o admin, via requireAdmin()). Sem policy + RLS habilitada = bloqueado
-- por padrão para authenticated/anon.
