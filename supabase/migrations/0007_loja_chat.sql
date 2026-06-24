-- Mini-loja pública (vitrine por slug) + chat em tempo real cliente ↔ manager.

-- ------------------------------------------------------- identidade da vitrine
alter table public.org
  add column if not exists slug text unique,
  add column if not exists loja_ativa boolean not null default false,
  add column if not exists loja_descricao text;

-- ------------------------------- vitrine pública via RPC (não expõe a tabela org)
-- Retorna só campos seguros + produtos ativos. SECURITY DEFINER + filtro por
-- loja_ativa garante que nada vaza de lojas privadas, e o anon não toca em org.
create or replace function public.loja_publica(p_slug text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'org_id', o.id,
    'nome', o.nome,
    'descricao', o.loja_descricao,
    'logo_url', o.logo_url,
    'cor_marca', o.cor_marca,
    'produtos', coalesce((
      select json_agg(json_build_object(
        'id', p.id, 'nome', p.nome, 'categoria', p.categoria, 'marca', p.marca,
        'preco_venda', p.preco_venda, 'preco_comparativo', p.preco_comparativo,
        'descricao', p.descricao, 'imagens', p.imagens,
        'variacoes', coalesce((
          select json_agg(json_build_object(
            'id', v.id, 'nome', v.nome, 'preco_ajuste', v.preco_ajuste, 'estoque_atual', v.estoque_atual
          ) order by v.nome)
          from public.produto_variacao v where v.produto_id = p.id and v.ativo
        ), '[]'::json)
      ) order by p.criado_em desc)
      from public.produto p where p.org_id = o.id and p.ativo
    ), '[]'::json)
  )
  from public.org o
  where o.slug = p_slug and o.loja_ativa = true
$$;
grant execute on function public.loja_publica(text) to anon, authenticated;

-- ----------------------------------------------------------------- chat
create table if not exists public.conversa (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  cliente_id uuid not null,            -- auth.uid() do cliente (login anônimo)
  cliente_nome text,
  criada_em timestamptz not null default now(),
  ultima_em timestamptz not null default now()
);
create index if not exists conversa_org_idx on public.conversa(org_id);
create index if not exists conversa_cliente_idx on public.conversa(cliente_id);

create table if not exists public.mensagem (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversa(id) on delete cascade,
  org_id uuid not null references public.org(id) on delete cascade,
  autor_id uuid not null,
  autor_tipo text not null,            -- 'cliente' | 'loja'
  texto text not null,
  criada_em timestamptz not null default now()
);
create index if not exists mensagem_conversa_idx on public.mensagem(conversa_id);

alter table public.conversa enable row level security;
alter table public.mensagem enable row level security;
grant select, insert, update on public.conversa to anon, authenticated;
grant select, insert on public.mensagem to anon, authenticated;

-- conversa: o cliente vê/cria a sua; o dono da loja vê as da org dele.
drop policy if exists conversa_select on public.conversa;
create policy conversa_select on public.conversa for select to authenticated
  using (
    cliente_id = (select auth.uid())
    or (org_id = private.current_org_id() and private.current_role() = 'owner')
  );
drop policy if exists conversa_insert on public.conversa;
create policy conversa_insert on public.conversa for insert to authenticated
  with check (cliente_id = (select auth.uid()));
drop policy if exists conversa_update on public.conversa;
create policy conversa_update on public.conversa for update to authenticated
  using (
    cliente_id = (select auth.uid())
    or (org_id = private.current_org_id() and private.current_role() = 'owner')
  );

-- mensagem: visível/insertável pelos participantes da conversa.
drop policy if exists mensagem_select on public.mensagem;
create policy mensagem_select on public.mensagem for select to authenticated
  using (
    exists (
      select 1 from public.conversa c where c.id = conversa_id and (
        c.cliente_id = (select auth.uid())
        or (c.org_id = private.current_org_id() and private.current_role() = 'owner')
      )
    )
  );
drop policy if exists mensagem_insert on public.mensagem;
create policy mensagem_insert on public.mensagem for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and exists (
      select 1 from public.conversa c where c.id = conversa_id and (
        c.cliente_id = (select auth.uid())
        or (c.org_id = private.current_org_id() and private.current_role() = 'owner')
      )
    )
  );

-- realtime
do $$ begin
  alter publication supabase_realtime add table public.mensagem;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversa;
exception when duplicate_object then null; end $$;
