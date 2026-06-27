-- ============================================================================
-- (D) Vitrine pública não expõe mais a QUANTIDADE exata de estoque — só um
--     booleano "esgotado". Antes, loja_publica devolvia estoque_atual do produto
--     e de cada variação, visível no DevTools de qualquer visitante (concorrente
--     via inventário). A vitrine só usa o "Esgotado", então nada quebra.
--
-- (B) Limite de VENDEDORES internos por plano (Equipe = até 3, Expansão =
--     ilimitado), igual ao anunciado na landing. Antes era ilimitado em todos.
-- ============================================================================

-- (D) RPC pública: troca estoque_atual por esgotado (produto e variação).
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
    'capa_url', o.loja_capa_url,
    'cor_marca', o.cor_marca,
    'fonte', o.loja_fonte,
    'sobre', o.loja_sobre,
    'email', o.loja_email,
    'whatsapp', o.loja_whatsapp,
    'telefone', o.loja_telefone,
    'instagram', o.loja_instagram,
    'facebook', o.loja_facebook,
    'tiktok', o.loja_tiktok,
    'produtos', coalesce((
      select json_agg(json_build_object(
        'id', p.id, 'nome', p.nome, 'categoria', p.categoria, 'marca', p.marca,
        'preco_venda', p.preco_venda, 'preco_comparativo', p.preco_comparativo,
        'descricao', p.descricao, 'imagens', p.imagens,
        'esgotado', (p.estoque_atual <= 0),
        'variacoes', coalesce((
          select json_agg(json_build_object(
            'id', v.id, 'nome', v.nome, 'preco_ajuste', v.preco_ajuste,
            'esgotado', (v.estoque_atual <= 0)
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

-- (B) limite de vendedores internos por plano (null = ilimitado).
create or replace function private.limite_vendedores(p_org uuid)
returns int language sql stable security definer set search_path = public as $$
  select case coalesce(private.plano_efetivo(p_org), 'ambulante')
    when 'equipe' then 3
    when 'expansao' then null   -- ilimitado
    else 0                      -- ambulante/solo não têm vendedores internos
  end
$$;

-- enforcement no insert de usuario: papel permitido E dentro do limite de vendedores.
create or replace function private.checar_papel_membro()
returns trigger language plpgsql security definer set search_path = public as $$
declare lim int;
begin
  if NEW.role in ('vendedor','motoboy') and not private.permite_papel(NEW.org_id, NEW.role) then
    raise exception 'papel_nao_permitido' using detail = NEW.role;
  end if;
  if NEW.role = 'vendedor' then
    lim := private.limite_vendedores(NEW.org_id);
    if lim is not null and (
      select count(*) from public.usuario
      where org_id = NEW.org_id and role = 'vendedor' and id <> NEW.id
    ) >= lim then
      raise exception 'limite_vendedores' using detail = lim::text;
    end if;
  end if;
  return NEW;
end $$;
-- o trigger trg_papel_membro (0013) já aponta para esta função; nada mais a fazer.
