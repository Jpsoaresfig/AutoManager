-- ============================================================================
-- Registro de venda ATÔMICO para o dono/vendedor + confirmação de recebimento
-- também atômica e idempotente.
--
-- Motivo: o caminho do dono em lib/store.ts (`registrarVenda`/`confirmarEntrada`)
-- fazia vários INSERT/UPDATE soltos no cliente, sem transação, sem checar erro e
-- sem reverter o estado otimista. Isso permitia: venda "confirmada" na tela sem
-- nada gravado, venda sem itens (insert da venda passa, dos itens falha), estoque
-- divergente, oversell por baixa não-atômica e venda DUPLICADA ao confirmar um
-- recebimento duas vezes.
--
-- Aqui centralizamos tudo numa transação SECURITY DEFINER (como já era feito na
-- `revendedora_registrar_venda` do 0011/0025): valida estoque, baixa de forma
-- relativa (estoque_atual = estoque_atual - qtd) e grava itens/movimentos juntos.
-- O id da venda vem do cliente (p_venda_id) para casar com o update otimista.
-- ============================================================================

-- ---------------------------------------------------------------- registrar_venda
-- Dono ou vendedor interno registram uma venda inteira numa transação.
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
  if v_org is null or v_role not in ('owner','vendedor') then
    raise exception 'sem_permissao';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'sem_itens';
  end if;

  -- revendedora opcional (precisa ser da própria org)
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
  -- comissão sobre o total JÁ com desconto (igual à UI e ao caminho da revendedora)
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

  -- 2) itens + baixa de estoque (relativa = atômica)
  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'qtd')::int;
    select * into v_prod from public.produto where id = (v_item->>'produto_id')::uuid;
    if nullif(v_item->>'variacao_id','') is not null then
      select * into v_var from public.produto_variacao where id = (v_item->>'variacao_id')::uuid;
      v_preco := v_prod.preco_venda + coalesce(v_var.preco_ajuste, 0);
      update public.produto_variacao set estoque_atual = estoque_atual - v_qtd where id = v_var.id;
      insert into public.venda_item (venda_id, org_id, produto_id, variacao_id, variacao_nome, nome, qtd, preco_unit, custo_unit, comissao_percent_aplicada)
      values (p_venda_id, v_org, v_prod.id, v_var.id, v_var.nome, v_prod.nome, v_qtd, v_preco, v_prod.custo, v_comissao_pct);
    else
      v_preco := v_prod.preco_venda;
      insert into public.venda_item (venda_id, org_id, produto_id, variacao_id, variacao_nome, nome, qtd, preco_unit, custo_unit, comissao_percent_aplicada)
      values (p_venda_id, v_org, v_prod.id, null, null, v_prod.nome, v_qtd, v_preco, v_prod.custo, v_comissao_pct);
    end if;
    update public.produto set estoque_atual = estoque_atual - v_qtd where id = v_prod.id;
    insert into public.movimento_estoque (org_id, produto_id, tipo, qtd, motivo, ref_venda_id)
    values (v_org, v_prod.id, 'saida', v_qtd, 'Venda', p_venda_id);
  end loop;

  return json_build_object('id', p_venda_id, 'total', v_total, 'custo_total', v_custo,
    'comissao_total', v_comissao, 'lucro', round(v_total - v_custo - v_comissao, 2));
end;
$$;
grant execute on function public.registrar_venda(uuid, jsonb, text, uuid, text, int, numeric, boolean) to authenticated;

-- ---------------------------------------------------------------- confirmar_entrada
-- "Sim, foi venda da loja": cria a venda avulsa e marca a entrada como confirmada,
-- tudo na mesma transação. Idempotente: se a entrada já foi decidida (reenvio,
-- duplo-clique, segunda aba), NÃO cria outra venda — devolve a existente.
create or replace function public.confirmar_entrada(p_entrada_id uuid, p_venda_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := private.current_org_id();
  v_role text := private.current_role();
  v_ent public.entrada_pendente;
  v_data timestamptz;
begin
  if v_org is null or v_role <> 'owner' then raise exception 'sem_permissao'; end if;

  -- trava a linha: bloqueia confirmação concorrente da mesma entrada
  select * into v_ent from public.entrada_pendente
    where id = p_entrada_id and org_id = v_org for update;
  if v_ent.id is null then raise exception 'entrada_invalida'; end if;

  -- já decidida: idempotente, devolve a venda que já existia (se houver)
  if v_ent.status <> 'pendente' then
    return json_build_object('id', v_ent.venda_id, 'ja_decidida', true);
  end if;

  v_data := coalesce(v_ent.recebido_em, now());

  insert into public.venda (id, org_id, canal, revendedora_id, total, custo_total, comissao_total, lucro,
    status_comissao, forma_pagamento, parcelas, status_pagamento, desconto, data, data_pagamento)
  values (p_venda_id, v_org, 'loja', null, v_ent.valor, 0, 0, v_ent.valor,
    'paga', v_ent.forma_pagamento, 1, 'paga', 0, v_data, v_data);

  update public.entrada_pendente
    set status = 'confirmada', venda_id = p_venda_id, decidido_em = now()
    where id = p_entrada_id;

  return json_build_object('id', p_venda_id, 'total', v_ent.valor);
end;
$$;
grant execute on function public.confirmar_entrada(uuid, uuid) to authenticated;
