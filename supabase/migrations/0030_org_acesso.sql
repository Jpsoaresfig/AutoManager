-- ============================================================================
-- Moderação de contas pelo super-admin: cada loja (org) ganha um estado de
-- acesso. 'ativo' (padrão), 'desativado' (suspensa) ou 'banido'. O bloqueio de
-- login de fato é feito no auth.users (ban) pela rota /api/admin/usuario; esta
-- coluna guarda o RÓTULO/intenção para exibir no painel e distinguir os estados.
-- ============================================================================

alter table public.org
  add column if not exists acesso text not null default 'ativo';  -- ativo | desativado | banido
