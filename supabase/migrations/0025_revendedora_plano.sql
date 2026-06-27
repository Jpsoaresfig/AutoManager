-- ============================================================================
-- Fecha o acesso da revendedora quando o PLANO não permite revendedoras.
--
-- Contexto: no plano AMBULANTE (0023) o limite de revendedoras é 0. O trigger
-- de 0013 só barra INSERT/reativação acima do limite — revendedoras que já
-- existiam antes do downgrade continuam `ativa` e conseguiam logar pelo /acesso,
-- porque TODO o acesso delas passa por RPCs SECURITY DEFINER (0011) que filtravam
-- apenas `user_id = auth.uid() and ativa`, sem olhar o plano.
--
-- Aqui adicionamos a checagem de plano nesse ponto único de estrangulamento:
-- se o plano efetivo permite 0 revendedoras, NENHUMA delas loga, lê catálogo,
-- vê vendas ou registra venda. Os dados continuam no banco (nada é apagado);
-- ela volta a ter acesso assim que a loja subir para um plano com revendedoras.
-- ============================================================================

-- O plano EFETIVO da org permite ter revendedoras? (limite null = ilimitado;
-- 0 = bloqueado, como no AMBULANTE; >0 = permitido).
create or replace function private.permite_revendedoras(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.limite_revendedoras(p_org), 1) > 0
$$;

-- ----------------------------------------------------------- RPCs (0011) + plano
-- Identidade da revendedora — é o gate do /acesso (se vier null, faz signOut).
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
  where r.user_id = auth.uid() and r.ativa and private.permite_revendedoras(r.org_id)
  limit 1
$$;
grant execute on function public.revendedora_me() to authenticated;

-- Catálogo da loja para a revendedora.
create or replace function public.revendedora_catalogo()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with org as (
    select org_id from public.revendedora
    where user_id = auth.uid() and ativa and private.permite_revendedoras(org_id)
    limit 1
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

-- Vendas da revendedora.
create or replace function public.revendedora_minhas_vendas()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with rev as (
    select id from public.revendedora
    where user_id = auth.uid() and ativa and private.permite_revendedoras(org_id)
    limit 1
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

-- Registro de venda pela revendedora — só seleciona a revendedora se o plano permite.
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
    where user_id = auth.uid() and ativa and private.permite_revendedoras(org_id) limit 1;
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
