-- ============================================================================
-- LOTE 2 - ALTO: vazamento de custo/lucro (A-1), oversell (A-2), vendedor
-- operando após downgrade (A-4).
--
-- A-1  As policies de SELECT geradas no 0001 (org-wide, sem papel) sobreviveram
--      ao 0006 (que só restringiu escrita). Resultado: vendedor e motoboy liam
--      custo, lucro, comissões, recebimentos e contas a pagar. Agora a LEITURA
--      das tabelas financeiras é só do owner; o vendedor recebe o catálogo (sem
--      custo) pela RPC produtos_para_venda().
--
-- A-2  Baixa de estoque sem guard atômico permitia estoque negativo em corrida.
--      Agora o UPDATE só baixa se houver saldo (where estoque_atual >= qtd) e
--      aborta a venda inteira se não houver; + CHECK (estoque_atual >= 0) como
--      defesa em profundidade. Invariante: para produto com variações,
--      produto.estoque_atual = soma das variações (estoqueEfetivo no store), logo
--      o guard no pai nunca bloqueia uma venda válida de variação.
--
-- A-4  Vendedor continuava vendendo após o plano cair abaixo do limite de
--      vendedores. Agora registrar_venda e as RLS de inserção exigem
--      private.vendedor_no_limite (acesso por POSIÇÃO, igual às revendedoras).
-- ============================================================================

-- ----------------------------------------------------- A-2: CHECK não-negativo
-- normaliza eventuais negativos pré-existentes (corrupção de oversell anterior)
update public.produto set estoque_atual = 0 where estoque_atual < 0;
update public.produto_variacao set estoque_atual = 0 where estoque_atual < 0;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'produto_estoque_nao_negativo') then
    alter table public.produto add constraint produto_estoque_nao_negativo check (estoque_atual >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'produto_variacao_estoque_nao_negativo') then
    alter table public.produto_variacao add constraint produto_variacao_estoque_nao_negativo check (estoque_atual >= 0);
  end if;
end $$;

-- --------------------------------------- A-4: ordem de criação + limite vendedor
-- usuario não tinha timestamp; precisamos dele para o acesso "por posição".
alter table public.usuario add column if not exists criada_em timestamptz not null default now();

-- o vendedor está entre os N mais antigos permitidos pelo plano? (N = limite_vendedores)
-- não-vendedor (owner/motoboy) -> true (não se aplica). ilimitado (expansao) -> true.
create or replace function private.vendedor_no_limite(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with u as (
    select id, org_id from public.usuario where id = p_uid and role = 'vendedor'
  )
  select case
    when not exists (select 1 from u) then true
    when private.limite_vendedores((select org_id from u)) is null then true
    when private.limite_vendedores((select org_id from u)) = 0 then false
    else exists (
      select 1 from (
        select id from public.usuario
        where org_id = (select org_id from u) and role = 'vendedor'
        order by criada_em asc, id asc
        limit private.limite_vendedores((select org_id from u))
      ) permitidos
      where permitidos.id = (select id from u)
    )
  end
$$;

-- ------------------------------------------ A-1: LEITURA financeira só do owner
-- produto/produto_variacao: leitura só do owner (vendedor usa produtos_para_venda).
drop policy if exists produto_select on public.produto;
create policy produto_select on public.produto for select to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

drop policy if exists produto_variacao_select on public.produto_variacao;
create policy produto_variacao_select on public.produto_variacao for select to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

-- venda/venda_item/revendedora/movimento_estoque: leitura só do owner.
drop policy if exists venda_select on public.venda;
create policy venda_select on public.venda for select to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

drop policy if exists venda_item_select on public.venda_item;
create policy venda_item_select on public.venda_item for select to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

drop policy if exists revendedora_select on public.revendedora;
create policy revendedora_select on public.revendedora for select to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

drop policy if exists movimento_estoque_select on public.movimento_estoque;
create policy movimento_estoque_select on public.movimento_estoque for select to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

-- entrada_pendente / conta_pagar: idem (tabelas de 0024/0033 - guard p/ idempotência).
do $$
begin
  if to_regclass('public.entrada_pendente') is not null then
    drop policy if exists entrada_pendente_select on public.entrada_pendente;
    create policy entrada_pendente_select on public.entrada_pendente for select to authenticated
      using (org_id = private.current_org_id() and private.current_role() = 'owner');
  end if;
  if to_regclass('public.conta_pagar') is not null then
    drop policy if exists conta_pagar_select on public.conta_pagar;
    create policy conta_pagar_select on public.conta_pagar for select to authenticated
      using (org_id = private.current_org_id() and private.current_role() = 'owner');
  end if;
end $$;

-- lista de membros (nome/e-mail dos colegas) é só do owner; cada usuário continua
-- vendo a própria linha por usuario_self_select (0001).
drop policy if exists usuario_select_org on public.usuario;
create policy usuario_select_org on public.usuario for select to authenticated
  using (org_id = private.current_org_id() and private.current_role() = 'owner');

-- catálogo para o vendedor (e owner) SEM custo/imposto. SECURITY DEFINER: ignora a
-- RLS de produto (agora owner-only) e devolve só os campos de venda.
create or replace function public.produtos_para_venda()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with ctx as (select private.current_org_id() as org, private.current_role() as role)
  select coalesce((
    select json_agg(json_build_object(
      'id', p.id, 'nome', p.nome, 'categoria', p.categoria, 'sku', p.sku, 'marca', p.marca,
      'custo', 0, 'imposto_percent', 0,
      'preco_venda', p.preco_venda, 'preco_comparativo', p.preco_comparativo,
      'descricao', p.descricao, 'imagens', p.imagens,
      'estoque_atual', p.estoque_atual, 'estoque_minimo', p.estoque_minimo,
      'ativo', p.ativo, 'criado_em', p.criado_em,
      'produto_variacao', coalesce((
        select json_agg(json_build_object(
          'id', v.id, 'nome', v.nome, 'sku', v.sku, 'preco_ajuste', v.preco_ajuste,
          'estoque_atual', v.estoque_atual, 'ativo', v.ativo
        ) order by v.nome)
        from public.produto_variacao v where v.produto_id = p.id
      ), '[]'::json)
    ) order by p.criado_em asc)
    from public.produto p, ctx
    where p.org_id = ctx.org and ctx.role in ('owner', 'vendedor')
  ), '[]'::json)
$$;
grant execute on function public.produtos_para_venda() to authenticated;

-- ------------------------------- A-4: RLS de inserção exige vendedor no limite
-- (defesa em profundidade; o caminho normal é a RPC registrar_venda abaixo)
drop policy if exists venda_insert on public.venda;
create policy venda_insert on public.venda for insert to authenticated
  with check (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or (private.current_role() = 'vendedor' and private.vendedor_no_limite((select auth.uid())))
    )
  );

drop policy if exists venda_item_insert on public.venda_item;
create policy venda_item_insert on public.venda_item for insert to authenticated
  with check (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or (private.current_role() = 'vendedor' and private.vendedor_no_limite((select auth.uid())))
    )
  );

drop policy if exists movimento_estoque_insert on public.movimento_estoque;
create policy movimento_estoque_insert on public.movimento_estoque for insert to authenticated
  with check (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or (private.current_role() = 'vendedor' and tipo = 'saida' and private.vendedor_no_limite((select auth.uid())))
    )
  );

-- ------------------------------------- A-2 + A-4: registrar_venda endurecida
create or replace function public.registrar_venda(
  p_venda_id uuid,
  p_itens jsonb,
  p_canal text default 'whatsapp',
  p_revendedora_id uuid default null,
  p_forma text default 'dinheiro',
  p_parcelas int default 1,
  p_desconto numeric default 0,
  p_fiado boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := private.current_org_id();
  v_role text := private.current_role();
  v_rev public.revendedora;
  v_comissao_pct numeric := 0;
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
  v_status_pag text;
  v_data_pag timestamptz;
begin
  if v_org is null or v_role not in ('owner', 'vendedor') then
    raise exception 'sem_permissao';
  end if;
  -- A-4: vendedor fora do limite do plano (ex.: após downgrade) não registra venda.
  if v_role = 'vendedor' and not private.vendedor_no_limite(auth.uid()) then
    raise exception 'sem_acesso_plano';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'sem_itens';
  end if;

  if p_revendedora_id is not null then
    select * into v_rev from public.revendedora where id = p_revendedora_id and org_id = v_org;
    if v_rev.id is null then raise exception 'revendedora_invalida'; end if;
    v_comissao_pct := coalesce(v_rev.comissao_percent, 0);
  end if;

  if p_forma not in ('dinheiro','pix','boleto','credito','debito') then p_forma := 'dinheiro'; end if;
  if p_parcelas is null or p_parcelas < 1 then p_parcelas := 1; end if;
  if p_forma <> 'credito' then p_parcelas := 1; end if;

  -- 1) valida estoque + soma bruto/custo
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
  v_total := round(v_bruto - v_desc, 2);
  v_custo := round(v_custo, 2);
  v_comissao := round(v_total * v_comissao_pct / 100.0, 2);

  if p_fiado then
    v_status_pag := 'pendente'; v_data_pag := null;
  else
    v_status_pag := 'paga'; v_data_pag := now();
  end if;

  insert into public.venda (id, org_id, canal, revendedora_id, total, custo_total, comissao_total, lucro,
    status_comissao, forma_pagamento, parcelas, status_pagamento, desconto, data_pagamento)
  values (p_venda_id, v_org, p_canal, p_revendedora_id, v_total, v_custo, v_comissao,
    round(v_total - v_custo - v_comissao, 2),
    'pendente', p_forma, p_parcelas, v_status_pag, round(v_desc, 2), v_data_pag);

  -- 2) itens + baixa de estoque com GUARD ATÔMICO (A-2)
  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'qtd')::int;
    select * into v_prod from public.produto where id = (v_item->>'produto_id')::uuid;
    if nullif(v_item->>'variacao_id','') is not null then
      select * into v_var from public.produto_variacao where id = (v_item->>'variacao_id')::uuid;
      v_preco := v_prod.preco_venda + coalesce(v_var.preco_ajuste, 0);
      update public.produto_variacao set estoque_atual = estoque_atual - v_qtd
        where id = v_var.id and estoque_atual >= v_qtd;
      if not found then raise exception 'sem_estoque'; end if;
      insert into public.venda_item (venda_id, org_id, produto_id, variacao_id, variacao_nome, nome, qtd, preco_unit, custo_unit, comissao_percent_aplicada)
      values (p_venda_id, v_org, v_prod.id, v_var.id, v_var.nome, v_prod.nome, v_qtd, v_preco, v_prod.custo, v_comissao_pct);
    else
      v_preco := v_prod.preco_venda;
      insert into public.venda_item (venda_id, org_id, produto_id, variacao_id, variacao_nome, nome, qtd, preco_unit, custo_unit, comissao_percent_aplicada)
      values (p_venda_id, v_org, v_prod.id, null, null, v_prod.nome, v_qtd, v_preco, v_prod.custo, v_comissao_pct);
    end if;
    -- pai (= soma das variações p/ produto com variação): guard nunca bloqueia venda válida
    update public.produto set estoque_atual = estoque_atual - v_qtd
      where id = v_prod.id and estoque_atual >= v_qtd;
    if not found then raise exception 'sem_estoque'; end if;
    insert into public.movimento_estoque (org_id, produto_id, tipo, qtd, motivo, ref_venda_id)
    values (v_org, v_prod.id, 'saida', v_qtd, 'Venda', p_venda_id);
  end loop;

  -- A-1 (defesa em profundidade): vendedor não recebe custo/lucro nem no retorno do RPC.
  if v_role = 'vendedor' then
    return json_build_object('id', p_venda_id, 'total', v_total, 'comissao_total', v_comissao);
  end if;
  return json_build_object('id', p_venda_id, 'total', v_total, 'custo_total', v_custo,
    'comissao_total', v_comissao, 'lucro', round(v_total - v_custo - v_comissao, 2));
end;
$$;

-- --------------------- A-2 + B-2: revendedora_registrar_venda (guard + round)
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
  select * into v_rev from public.revendedora
    where user_id = auth.uid() and ativa and private.revendedora_no_limite(id) limit 1;
  if v_rev.id is null then raise exception 'sem_acesso'; end if;
  v_org := v_rev.org_id;

  if p_forma not in ('dinheiro','pix','boleto','credito','debito') then p_forma := 'dinheiro'; end if;
  if p_parcelas is null or p_parcelas < 1 then p_parcelas := 1; end if;
  if p_forma <> 'credito' then p_parcelas := 1; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'sem_itens'; end if;

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
  v_total := round(v_bruto - v_desc, 2);
  v_custo := round(v_custo, 2);
  v_comissao := round(v_total * v_rev.comissao_percent / 100.0, 2);

  insert into public.venda (id, org_id, canal, revendedora_id, total, custo_total, comissao_total, lucro,
    status_comissao, forma_pagamento, parcelas, status_pagamento, desconto, data_pagamento)
  values (v_venda_id, v_org, p_canal, v_rev.id, v_total, v_custo, v_comissao,
    round(v_total - v_custo - v_comissao, 2),
    'pendente', p_forma, p_parcelas, 'paga', round(v_desc, 2), now());

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'qtd')::int;
    select * into v_prod from public.produto where id = (v_item->>'produto_id')::uuid;
    if nullif(v_item->>'variacao_id','') is not null then
      select * into v_var from public.produto_variacao where id = (v_item->>'variacao_id')::uuid;
      v_preco := v_prod.preco_venda + coalesce(v_var.preco_ajuste, 0);
      update public.produto_variacao set estoque_atual = estoque_atual - v_qtd
        where id = v_var.id and estoque_atual >= v_qtd;
      if not found then raise exception 'sem_estoque'; end if;
      insert into public.venda_item (venda_id, org_id, produto_id, variacao_id, variacao_nome, nome, qtd, preco_unit, custo_unit, comissao_percent_aplicada)
      values (v_venda_id, v_org, v_prod.id, v_var.id, v_var.nome, v_prod.nome, v_qtd, v_preco, v_prod.custo, v_rev.comissao_percent);
    else
      v_preco := v_prod.preco_venda;
      insert into public.venda_item (venda_id, org_id, produto_id, variacao_id, variacao_nome, nome, qtd, preco_unit, custo_unit, comissao_percent_aplicada)
      values (v_venda_id, v_org, v_prod.id, null, null, v_prod.nome, v_qtd, v_preco, v_prod.custo, v_rev.comissao_percent);
    end if;
    update public.produto set estoque_atual = estoque_atual - v_qtd
      where id = v_prod.id and estoque_atual >= v_qtd;
    if not found then raise exception 'sem_estoque'; end if;
    insert into public.movimento_estoque (org_id, produto_id, tipo, qtd, motivo, ref_venda_id)
    values (v_org, v_prod.id, 'saida', v_qtd, 'Venda revendedora', v_venda_id);
  end loop;

  return json_build_object('id', v_venda_id, 'total', v_total, 'comissao', v_comissao);
end;
$$;
grant execute on function public.revendedora_registrar_venda(jsonb, text, int, text, numeric) to authenticated;
