-- Produto completo: marca, imposto, preço comparativo, descrição, fotos e variações/grade.

alter table public.produto
  add column if not exists marca text,
  add column if not exists imposto_percent numeric(5,2) not null default 0,
  add column if not exists preco_comparativo numeric(12,2),
  add column if not exists descricao text,
  add column if not exists imagens text[] not null default array[]::text[];

-- variações/grade (ex.: "Aro 16", "Dourado / P") com SKU e estoque próprios.
create table if not exists public.produto_variacao (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  produto_id uuid not null references public.produto(id) on delete cascade,
  nome text not null,
  sku text,
  estoque_atual int not null default 0,
  preco_ajuste numeric(12,2) not null default 0,   -- delta sobre o preço base
  ativo boolean not null default true,
  criada_em timestamptz not null default now()
);
create index if not exists produto_variacao_produto_idx on public.produto_variacao(produto_id);
create index if not exists produto_variacao_org_idx on public.produto_variacao(org_id);

-- a venda registra qual variação saiu (quando houver)
alter table public.venda_item
  add column if not exists variacao_id uuid references public.produto_variacao(id) on delete set null,
  add column if not exists variacao_nome text;

-- ------------------------------------------------------------------- RLS
alter table public.produto_variacao enable row level security;

drop policy if exists produto_variacao_select on public.produto_variacao;
drop policy if exists produto_variacao_insert on public.produto_variacao;
drop policy if exists produto_variacao_update on public.produto_variacao;
drop policy if exists produto_variacao_delete on public.produto_variacao;

create policy produto_variacao_select on public.produto_variacao
  for select to authenticated using (org_id = private.current_org_id());
create policy produto_variacao_insert on public.produto_variacao
  for insert to authenticated with check (org_id = private.current_org_id());
create policy produto_variacao_update on public.produto_variacao
  for update to authenticated
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());
create policy produto_variacao_delete on public.produto_variacao
  for delete to authenticated using (org_id = private.current_org_id());

grant select, insert, update, delete on public.produto_variacao to authenticated;

-- ------------------------------------------------ fotos de produto (Storage)
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

drop policy if exists "produto_img_leitura_publica" on storage.objects;
create policy "produto_img_leitura_publica" on storage.objects
  for select to public
  using (bucket_id = 'produtos');

drop policy if exists "produto_img_insert_org" on storage.objects;
create policy "produto_img_insert_org" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'produtos'
    and (storage.foldername(name))[1] = private.current_org_id()::text
  );

drop policy if exists "produto_img_update_org" on storage.objects;
create policy "produto_img_update_org" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'produtos'
    and (storage.foldername(name))[1] = private.current_org_id()::text
  );

drop policy if exists "produto_img_delete_org" on storage.objects;
create policy "produto_img_delete_org" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'produtos'
    and (storage.foldername(name))[1] = private.current_org_id()::text
  );
