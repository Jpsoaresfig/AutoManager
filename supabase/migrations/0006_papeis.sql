-- Papéis (owner / vendedor / motoboy), planos e entregas, com RLS por papel.
-- Papel mora em public.usuario.role. Planos em public.org.plano.

-- ----------------------------------------------- helper: papel do usuário atual
-- SECURITY DEFINER p/ não recursar a RLS de public.usuario dentro das policies.
create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.usuario where id = auth.uid()
$$;

-- ------------------------- bootstrap de signup ciente de convite (membro de org)
-- Se o cadastro vier com metadata org_id (membro criado pelo admin), entra NAQUELA
-- org com o papel informado; senão cria uma org nova (dono).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_org uuid;
  convite_org uuid;
  convite_role text;
begin
  convite_org := nullif(new.raw_user_meta_data->>'org_id', '')::uuid;
  convite_role := nullif(new.raw_user_meta_data->>'role', '');

  if convite_org is not null then
    insert into public.usuario (id, org_id, nome, email, role)
    values (
      new.id, convite_org,
      new.raw_user_meta_data->>'nome', new.email,
      coalesce(convite_role, 'vendedor')
    );
    return new;
  end if;

  insert into public.org (nome)
  values (coalesce(nullif(new.raw_user_meta_data->>'nome_loja', ''), 'Minha Loja'))
  returning id into nova_org;

  insert into public.usuario (id, org_id, nome, email)
  values (new.id, nova_org, new.raw_user_meta_data->>'nome', new.email);

  return new;
end;
$$;

-- ----------------------------------------------------------- tabela de entregas
create table if not exists public.entrega (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  venda_id uuid references public.venda(id) on delete set null,
  motoboy_id uuid references public.usuario(id) on delete set null,
  cliente_nome text,
  endereco text,
  telefone text,
  taxa numeric(12,2) not null default 0,
  status text not null default 'pendente',   -- 'pendente' | 'a_caminho' | 'entregue'
  observacao text,
  criada_em timestamptz not null default now(),
  entregue_em timestamptz
);
create index if not exists entrega_org_idx on public.entrega(org_id);
create index if not exists entrega_motoboy_idx on public.entrega(motoboy_id);
alter table public.entrega enable row level security;
grant select, insert, update, delete on public.entrega to authenticated;

-- ============================================================== RLS por papel
-- usuario: owner enxerga todos os membros da org; cada um enxerga a si mesmo.
drop policy if exists usuario_select_org on public.usuario;
create policy usuario_select_org on public.usuario
  for select to authenticated using (org_id = private.current_org_id());

drop policy if exists usuario_update_owner on public.usuario;
create policy usuario_update_owner on public.usuario
  for update to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner')
  with check (org_id = private.current_org_id());

drop policy if exists usuario_delete_owner on public.usuario;
create policy usuario_delete_owner on public.usuario
  for delete to authenticated
  using (
    org_id = private.current_org_id()
    and private.current_role() = 'owner'
    and id <> (select auth.uid())
  );

-- org: só o dono altera configurações.
drop policy if exists org_update on public.org;
create policy org_update on public.org
  for update to authenticated
  using (id = private.current_org_id() and private.current_role() = 'owner')
  with check (id = private.current_org_id());

-- produto: leitura p/ toda a org; escrita só do dono.
drop policy if exists produto_insert on public.produto;
drop policy if exists produto_update on public.produto;
drop policy if exists produto_delete on public.produto;
create policy produto_insert on public.produto for insert to authenticated
  with check (org_id = private.current_org_id() and private.current_role() = 'owner');
create policy produto_update on public.produto for update to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner')
  with check (org_id = private.current_org_id());
create policy produto_delete on public.produto for delete to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

-- produto_variacao: idem produto (escrita só do dono).
drop policy if exists produto_variacao_insert on public.produto_variacao;
drop policy if exists produto_variacao_update on public.produto_variacao;
drop policy if exists produto_variacao_delete on public.produto_variacao;
create policy produto_variacao_insert on public.produto_variacao for insert to authenticated
  with check (org_id = private.current_org_id() and private.current_role() = 'owner');
create policy produto_variacao_update on public.produto_variacao for update to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner')
  with check (org_id = private.current_org_id());
create policy produto_variacao_delete on public.produto_variacao for delete to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

-- revendedora: gestão só do dono.
drop policy if exists revendedora_insert on public.revendedora;
drop policy if exists revendedora_update on public.revendedora;
drop policy if exists revendedora_delete on public.revendedora;
create policy revendedora_insert on public.revendedora for insert to authenticated
  with check (org_id = private.current_org_id() and private.current_role() = 'owner');
create policy revendedora_update on public.revendedora for update to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner')
  with check (org_id = private.current_org_id());
create policy revendedora_delete on public.revendedora for delete to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

-- venda + itens: dono e vendedor registram; só dono altera/exclui.
drop policy if exists venda_insert on public.venda;
drop policy if exists venda_update on public.venda;
drop policy if exists venda_delete on public.venda;
create policy venda_insert on public.venda for insert to authenticated
  with check (org_id = private.current_org_id() and private.current_role() in ('owner','vendedor'));
create policy venda_update on public.venda for update to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner')
  with check (org_id = private.current_org_id());
create policy venda_delete on public.venda for delete to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

drop policy if exists venda_item_insert on public.venda_item;
create policy venda_item_insert on public.venda_item for insert to authenticated
  with check (org_id = private.current_org_id() and private.current_role() in ('owner','vendedor'));

-- movimento_estoque: dono faz qualquer; vendedor só baixa de venda (saida).
drop policy if exists movimento_estoque_insert on public.movimento_estoque;
create policy movimento_estoque_insert on public.movimento_estoque for insert to authenticated
  with check (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or (private.current_role() = 'vendedor' and tipo = 'saida')
    )
  );

-- entrega: dono vê/gerencia tudo; motoboy vê e atualiza só as suas.
drop policy if exists entrega_select on public.entrega;
create policy entrega_select on public.entrega for select to authenticated
  using (
    org_id = private.current_org_id()
    and (private.current_role() = 'owner' or motoboy_id = (select auth.uid()))
  );
drop policy if exists entrega_insert on public.entrega;
create policy entrega_insert on public.entrega for insert to authenticated
  with check (org_id = private.current_org_id() and private.current_role() = 'owner');
drop policy if exists entrega_update on public.entrega;
create policy entrega_update on public.entrega for update to authenticated
  using (
    org_id = private.current_org_id()
    and (private.current_role() = 'owner' or motoboy_id = (select auth.uid()))
  )
  with check (org_id = private.current_org_id());
drop policy if exists entrega_delete on public.entrega;
create policy entrega_delete on public.entrega for delete to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');
