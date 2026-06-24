-- Acesso self-service das revendedoras: login próprio, catálogo e registro de venda.
-- A revendedora NÃO recebe linha em public.usuario (logo, as policies org-wide não a
-- alcançam) — todo o acesso dela passa por RPCs SECURITY DEFINER escopadas ao auth.uid().

-- ----------------------------------------------------------- schema
alter table public.revendedora
  add column if not exists email text,
  add column if not exists acesso_liberado boolean not null default false,
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists revendedora_user_idx on public.revendedora(user_id);

-- pagamento: nº de parcelas do cartão (boleto entra como texto livre em forma_pagamento)
alter table public.venda
  add column if not exists parcelas int not null default 1;

-- ------------------------------ trigger de signup ciente de anônimo e revendedora
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
  -- visitante anônimo (chat da vitrine) não vira org/usuario
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  convite_role := nullif(new.raw_user_meta_data->>'role', '');

  -- revendedora: o vínculo (revendedora.user_id) é feito pela rota de ativação;
  -- ela fica isolada das tabelas e só acessa via RPC.
  if convite_role = 'revendedora' then
    return new;
  end if;

  convite_org := nullif(new.raw_user_meta_data->>'org_id', '')::uuid;
  if convite_org is not null then
    insert into public.usuario (id, org_id, nome, email, role)
    values (new.id, convite_org, new.raw_user_meta_data->>'nome', new.email, coalesce(convite_role, 'vendedor'));
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

-- ============================================================ RPCs da revendedora
-- Identidade dela + da loja (sem dados sensíveis).
create or replace function public.revendedora_me()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'revendedora_id', r.id,
    'org_id', r.org_id,
    'nome', r.nome,
    'comissao_percent', r.comissao_percent,
    'loja_nome', o.nome,
    'cor_marca', o.cor_marca,
    'logo_url', o.logo_url
  )
  from public.revendedora r
  join public.org o on o.id = r.org_id
  where r.user_id = auth.uid() and r.ativa
  limit 1
$$;
grant execute on function public.revendedora_me() to authenticated;

-- Catálogo da loja (produtos ativos, SEM custo). Estoque incluso p/ a revendedora ver.
create or replace function public.revendedora_catalogo()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with org as (
    select org_id from public.revendedora where user_id = auth.uid() and ativa limit 1
  )
  select coalesce((
    select json_agg(json_build_object(
      'id', p.id, 'nome', p.nome, 'categoria', p.categoria, 'marca', p.marca,
      'preco_venda', p.preco_venda, 'preco_comparativo', p.preco_comparativo,
      'imagens', p.imagens, 'estoque_atual', p.estoque_atual,
      'variacoes', coalesce((
        select json_agg(json_build_object(
          'id', v.id, 'nome', v.nome, 'preco_ajuste', v.preco_ajuste, 'estoque_atual', v.estoque_atual
        ) order by v.nome)
        from public.produto_variacao v where v.produto_id = p.id and v.ativo
      ), '[]'::json)
    ) order by p.nome)
    from public.produto p, org
    where p.org_id = org.org_id and p.ativo
  ), '[]'::json)
$$;
grant execute on function public.revendedora_catalogo() to authenticated;

-- Vendas dela (sem custo/lucro; comissão é dela, então aparece).
create or replace function public.revendedora_minhas_vendas()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with rev as (
    select id from public.revendedora where user_id = auth.uid() and ativa limit 1
  )
  select coalesce((
    select json_agg(json_build_object(
      'id', s.id, 'data', s.data, 'total', s.total, 'comissao_total', s.comissao_total,
      'forma_pagamento', s.forma_pagamento, 'parcelas', s.parcelas,
      'status_comissao', s.status_comissao,
      'itens', coalesce((
        select json_agg(json_build_object('nome', i.nome, 'qtd', i.qtd, 'variacao_nome', i.variacao_nome))
        from public.venda_item i where i.venda_id = s.id
      ), '[]'::json)
    ) order by s.data desc)
    from public.venda s, rev
    where s.revendedora_id = rev.id
  ), '[]'::json)
$$;
grant execute on function public.revendedora_minhas_vendas() to authenticated;

-- Registra a venda da revendedora: valida estoque, calcula totais/comissão, baixa estoque.
create or replace function public.revendedora_registrar_venda(
  p_itens jsonb,
  p_forma text default 'dinheiro',
  p_parcelas int default 1,
  p_canal text default 'whatsapp',
  p_desconto numeric default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev public.revendedora;
  v_org uuid;
  v_venda_id uuid := gen_random_uuid();
  v_item jsonb;
  v_prod public.produto;
  v_var public.produto_variacao;
  v_preco numeric;
  v_qtd int;
  v_bruto numeric := 0;
  v_custo numeric := 0;
  v_desc numeric;
  v_total numeric;
  v_comissao numeric;
begin
  select * into v_rev from public.revendedora where user_id = auth.uid() and ativa limit 1;
  if v_rev.id is null then raise exception 'sem_acesso'; end if;
  v_org := v_rev.org_id;

  if p_forma not in ('dinheiro','pix','boleto','credito','debito') then p_forma := 'dinheiro'; end if;
  if p_parcelas is null or p_parcelas < 1 then p_parcelas := 1; end if;
  if p_forma <> 'credito' then p_parcelas := 1; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'sem_itens'; end if;

  -- 1) valida + soma
  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := coalesce((v_item->>'qtd')::int, 0);
    if v_qtd < 1 then raise exception 'qtd_invalida'; end if;
    select * into v_prod from public.produto where id = (v_item->>'produto_id')::uuid and org_id = v_org and ativo;
    if v_prod.id is null then raise exception 'produto_invalido'; end if;

    if nullif(v_item->>'variacao_id','') is not null then
      select * into v_var from public.produto_variacao where id = (v_item->>'variacao_id')::uuid and produto_id = v_prod.id and ativo;
      if v_var.id is null then raise exception 'variacao_invalida'; end if;
      if v_var.estoque_atual < v_qtd then raise exception 'sem_estoque'; end if;
      v_preco := v_prod.preco_venda + coalesce(v_var.preco_ajuste, 0);
    else
      if exists (select 1 from public.produto_variacao where produto_id = v_prod.id and ativo) then raise exception 'escolha_variacao'; end if;
      if v_prod.estoque_atual < v_qtd then raise exception 'sem_estoque'; end if;
      v_preco := v_prod.preco_venda;
    end if;

    v_bruto := v_bruto + v_preco * v_qtd;
    v_custo := v_custo + v_prod.custo * v_qtd;
  end loop;

  v_desc := least(greatest(coalesce(p_desconto, 0), 0), v_bruto);
  v_total := v_bruto - v_desc;
  v_comissao := v_total * v_rev.comissao_percent / 100.0;

  insert into public.venda (id, org_id, canal, revendedora_id, total, custo_total, comissao_total, lucro,
    status_comissao, forma_pagamento, parcelas, status_pagamento, desconto, data_pagamento)
  values (v_venda_id, v_org, p_canal, v_rev.id, v_total, v_custo, v_comissao, v_total - v_custo - v_comissao,
    'pendente', p_forma, p_parcelas, 'paga', v_desc, now());

  -- 2) itens + baixa de estoque
  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'qtd')::int;
    select * into v_prod from public.produto where id = (v_item->>'produto_id')::uuid;
    if nullif(v_item->>'variacao_id','') is not null then
      select * into v_var from public.produto_variacao where id = (v_item->>'variacao_id')::uuid;
      v_preco := v_prod.preco_venda + coalesce(v_var.preco_ajuste, 0);
      update public.produto_variacao set estoque_atual = estoque_atual - v_qtd where id = v_var.id;
      insert into public.venda_item (venda_id, org_id, produto_id, variacao_id, variacao_nome, nome, qtd, preco_unit, custo_unit, comissao_percent_aplicada)
      values (v_venda_id, v_org, v_prod.id, v_var.id, v_var.nome, v_prod.nome, v_qtd, v_preco, v_prod.custo, v_rev.comissao_percent);
    else
      v_preco := v_prod.preco_venda;
      insert into public.venda_item (venda_id, org_id, produto_id, variacao_id, variacao_nome, nome, qtd, preco_unit, custo_unit, comissao_percent_aplicada)
      values (v_venda_id, v_org, v_prod.id, null, null, v_prod.nome, v_qtd, v_preco, v_prod.custo, v_rev.comissao_percent);
    end if;
    update public.produto set estoque_atual = estoque_atual - v_qtd where id = v_prod.id;
    insert into public.movimento_estoque (org_id, produto_id, tipo, qtd, motivo, ref_venda_id)
    values (v_org, v_prod.id, 'saida', v_qtd, 'Venda revendedora', v_venda_id);
  end loop;

  return json_build_object('id', v_venda_id, 'total', v_total, 'comissao', v_comissao);
end;
$$;
grant execute on function public.revendedora_registrar_venda(jsonb, text, int, text, numeric) to authenticated;
