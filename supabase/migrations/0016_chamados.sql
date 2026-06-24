-- ============================================================================
-- Chamados de suporte (tickets) abertos pelos donos de loja.
-- Qualquer dono (owner) pode ABRIR um chamado; só o SUPERADMIN do AutoManager
-- (admin@automanager.com) pode LER e RESOLVER todos os chamados de todas as lojas.
-- ============================================================================

create table if not exists public.chamado (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.org(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  nome_loja text,
  email_contato text,
  whatsapp text,
  tipo text not null default 'erro',      -- erro | duvida | sugestao
  assunto text not null,
  mensagem text not null,
  status text not null default 'aberto',  -- aberto | resolvido
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists chamado_status_idx on public.chamado(status, created_at desc);
create index if not exists chamado_org_idx on public.chamado(org_id);

alter table public.chamado enable row level security;
grant select, insert, update on public.chamado to authenticated;

-- ---------------------------------------------------------------- superadmin
-- Único e-mail com god-mode sobre os chamados. Lê o claim de e-mail do JWT.
create or replace function private.eh_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'admin@automanager.com'
$$;

-- ---------------------------------------------------------------- policies
-- ABRIR: o dono abre um chamado vinculado à própria loja e ao próprio login.
drop policy if exists chamado_insert on public.chamado;
create policy chamado_insert on public.chamado for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and (org_id is null or org_id = private.current_org_id())
  );

-- LER: somente o superadmin enxerga os chamados (de todas as lojas).
drop policy if exists chamado_select on public.chamado;
create policy chamado_select on public.chamado for select to authenticated
  using (private.eh_admin());

-- RESOLVER / atualizar: somente o superadmin.
drop policy if exists chamado_update on public.chamado;
create policy chamado_update on public.chamado for update to authenticated
  using (private.eh_admin())
  with check (private.eh_admin());
