-- SemijóiasOS — schema de produção (multi-tenant com RLS).
-- Cada usuário (auth.users) pertence a uma org; todos os dados são isolados por org.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- tabelas
create table public.org (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Minha Loja',
  segmento text not null default 'semijoias',
  canais text[] not null default array['whatsapp'],
  usa_revendedoras boolean not null default true,
  margem_padrao numeric(6,2) not null default 100,
  comissao_padrao numeric(5,2) not null default 30,
  onboarding_completo boolean not null default false,
  plano text not null default 'free',
  criada_em timestamptz not null default now()
);

create table public.usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.org(id) on delete cascade,
  nome text,
  email text,
  role text not null default 'owner'
);

create table public.produto (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  nome text not null,
  categoria text,
  sku text,
  custo numeric(12,2) not null default 0,
  preco_venda numeric(12,2) not null default 0,
  estoque_atual int not null default 0,
  estoque_minimo int not null default 5,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index on public.produto(org_id);

create table public.revendedora (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  nome text not null,
  whatsapp text,
  comissao_percent numeric(5,2) not null default 30,
  ativa boolean not null default true,
  criada_em timestamptz not null default now()
);
create index on public.revendedora(org_id);

create table public.venda (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  data timestamptz not null default now(),
  canal text not null default 'whatsapp',
  revendedora_id uuid references public.revendedora(id) on delete set null,
  total numeric(12,2) not null default 0,
  custo_total numeric(12,2) not null default 0,
  comissao_total numeric(12,2) not null default 0,
  lucro numeric(12,2) not null default 0,
  status_comissao text not null default 'pendente'
);
create index on public.venda(org_id);

create table public.venda_item (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.venda(id) on delete cascade,
  org_id uuid not null references public.org(id) on delete cascade,
  produto_id uuid references public.produto(id) on delete set null,
  nome text not null,
  qtd int not null,
  preco_unit numeric(12,2) not null,
  custo_unit numeric(12,2) not null,
  comissao_percent_aplicada numeric(5,2) not null default 0
);
create index on public.venda_item(venda_id);

create table public.movimento_estoque (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  produto_id uuid references public.produto(id) on delete cascade,
  tipo text not null,                 -- 'entrada' | 'saida' | 'ajuste'
  qtd int not null,
  motivo text,
  ref_venda_id uuid references public.venda(id) on delete set null,
  data timestamptz not null default now()
);
create index on public.movimento_estoque(org_id);

-- helpers ficam em schema `private` (não exposto pela Data API/REST) para que
-- funções SECURITY DEFINER não sejam chamáveis via /rest/v1/rpc.
create schema if not exists private;
grant usage on schema private to authenticated, anon;

-- -------------------------------------------------- helper: org do usuário
-- SECURITY DEFINER para evitar recursão de RLS ao consultar usuario dentro
-- da própria policy. Só retorna a org do auth.uid() chamador.
create or replace function private.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.usuario where id = auth.uid()
$$;

-- ------------------------------------ bootstrap: cria org + usuario no signup
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_org uuid;
begin
  insert into public.org (nome)
  values (coalesce(nullif(new.raw_user_meta_data->>'nome_loja', ''), 'Minha Loja'))
  returning id into nova_org;

  insert into public.usuario (id, org_id, nome, email)
  values (new.id, nova_org, new.raw_user_meta_data->>'nome', new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ------------------------------------------------------------------- RLS
alter table public.org enable row level security;
alter table public.usuario enable row level security;
alter table public.produto enable row level security;
alter table public.revendedora enable row level security;
alter table public.venda enable row level security;
alter table public.venda_item enable row level security;
alter table public.movimento_estoque enable row level security;

-- usuario: vê/edita apenas a própria linha (predicado por auth.uid(), sem recursão)
create policy usuario_self_select on public.usuario
  for select to authenticated using (id = (select auth.uid()));

-- org: vê e edita a própria org
create policy org_select on public.org
  for select to authenticated using (id = private.current_org_id());
create policy org_update on public.org
  for update to authenticated
  using (id = private.current_org_id())
  with check (id = private.current_org_id());

-- macro-fato: cada tabela tenant ganha as 4 policies (select/insert/update/delete)
do $$
declare t text;
begin
  foreach t in array array['produto','revendedora','venda','venda_item','movimento_estoque']
  loop
    execute format($f$
      create policy %1$s_select on public.%1$s for select to authenticated
        using (org_id = private.current_org_id());
      create policy %1$s_insert on public.%1$s for insert to authenticated
        with check (org_id = private.current_org_id());
      create policy %1$s_update on public.%1$s for update to authenticated
        using (org_id = private.current_org_id())
        with check (org_id = private.current_org_id());
      create policy %1$s_delete on public.%1$s for delete to authenticated
        using (org_id = private.current_org_id());
    $f$, t);
  end loop;
end $$;

-- ------------------------------------------------ exposição via Data API
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.org, public.usuario, public.produto, public.revendedora,
  public.venda, public.venda_item, public.movimento_estoque
  to authenticated;
