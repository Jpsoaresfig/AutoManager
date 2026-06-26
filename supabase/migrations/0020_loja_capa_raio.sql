-- ============================================================================
-- Mais personalização da loja:
--   * loja_capa_url  -> imagem de capa/banner da vitrine pública
--   * app_raio       -> arredondamento dos cantos do painel (chave de lib/aparencia.ts)
-- A capa entra na RPC pública para a vitrine renderizá-la no topo.
-- ============================================================================

alter table public.org
  add column if not exists loja_capa_url text,
  add column if not exists app_raio text;

-- RPC pública: identidade + capa + contato + redes + produtos ativos.
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
        'estoque_atual', p.estoque_atual,
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
