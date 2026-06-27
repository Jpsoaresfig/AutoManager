-- ============================================================================
-- Trilha de auditoria do SUPER-ADMIN (append-only).
--
-- As ações sensíveis da plataforma - moderar conta (desativar/banir/reativar/
-- deletar) e trocar plano manualmente - passavam sem registro. Aqui guardamos
-- quem fez, quando, sobre qual loja e o quê. As rotas /api/admin/* gravam via
-- service_role (ignora RLS); só o super-admin LÊ; ninguém atualiza/apaga
-- (append-only de verdade: sem grant de update/delete e sem policy para isso).
-- ============================================================================

create table if not exists public.admin_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,              -- super-admin que executou
  acao text not null,                     -- desativar | banir | reativar | deletar | mudar_plano
  alvo_org_id uuid,                        -- loja afetada (sem FK: a org pode ser deletada na própria ação)
  alvo_descricao text,                     -- nome/dono da loja no momento da ação
  detalhe jsonb,                           -- payload extra (ex.: { de: 'solo', para: 'equipe' })
  criado_em timestamptz not null default now()
);
create index if not exists admin_log_criado_idx on public.admin_log(criado_em desc);
create index if not exists admin_log_org_idx on public.admin_log(alvo_org_id);

alter table public.admin_log enable row level security;

-- só o super-admin LÊ. Inserts são feitos pelas rotas via service_role (bypassa RLS).
grant select on public.admin_log to authenticated;
do $$ begin
  create policy admin_log_select on public.admin_log for select to authenticated
    using (private.eh_admin());
exception when duplicate_object then null; end $$;
