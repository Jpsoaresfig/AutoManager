-- ============================================================================
-- LOTE 1 — CORREÇÕES CRÍTICAS DE SEGURANÇA
--
-- C-1  Tomada de conta cross-tenant via signup.
--      private.handle_new_user() confiava em raw_user_meta_data->>'org_id'/'role',
--      ambos graváveis pelo cliente no supabase.auth.signUp({ options:{ data }}).
--      Qualquer anônimo virava OWNER de qualquer loja sabendo o org_id (que vaza
--      em loja_publica). Correção: o vínculo de membro/revendedora passa a vir
--      EXCLUSIVAMENTE de raw_app_meta_data (app_metadata), que o cliente NÃO
--      consegue definir no signUp — só o service_role (rotas /api/membros e
--      /api/revendedora/ativar). owner JAMAIS é criado por metadata.
--
-- C-2  Banimento decorativo. org.acesso ('ativo'|'desativado'|'banido') não era
--      consultado por nenhuma policy/RPC, e o "ban" só atingia public.usuario
--      (revendedoras vivem em revendedora.user_id, plano de auth paralelo). Loja
--      banida seguia vendendo (revendedoras) e com vitrine pública no ar.
--      Correção: org.acesso vira AUTORITATIVO na camada de dados —
--        * private.current_org_id() retorna NULL se a org não está ativa
--          (bloqueio imediato de todos os membros, inclusive com JWT já emitido
--          — também resolve M-4);
--        * RPCs da revendedora barram org inativa (via revendedora_no_limite);
--        * loja_publica() não serve loja inativa.
-- ============================================================================

-- ---------------------------------------------------------------- C-2: helper
create or replace function private.org_ativa(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select acesso from public.org where id = p_org), 'ativo') = 'ativo'
$$;

-- current_org_id: agora também exige org ATIVA. Banir/desativar tranca o acesso
-- de todos os membros na camada de dados na hora (não espera o JWT expirar).
create or replace function private.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.org_id
  from public.usuario u
  join public.org o on o.id = u.org_id
  where u.id = auth.uid()
    and coalesce(o.acesso, 'ativo') = 'ativo'
$$;

-- revendedora_no_limite: além da posição no plano, exige org ATIVA. Como as quatro
-- RPCs da revendedora (me/catalogo/minhas_vendas/registrar_venda) já passam por
-- esta função, a loja banida bloqueia todas elas de uma vez.
create or replace function private.revendedora_no_limite(p_rev uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select id, org_id from public.revendedora where id = p_rev and ativa
  )
  select case
    when not exists (select 1 from r) then false
    when not private.org_ativa((select org_id from r)) then false
    when private.limite_revendedoras((select org_id from r)) is null then true
    else exists (
      select 1 from (
        select id from public.revendedora
        where org_id = (select org_id from r) and ativa
        order by criada_em asc, id asc
        limit private.limite_revendedoras((select org_id from r))
      ) permitidas
      where permitidas.id = (select id from r)
    )
  end
$$;

-- loja_publica: vitrine/chat só no ar enquanto a loja está ativa E não banida.
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
  where o.slug = p_slug
    and o.loja_ativa = true
    and coalesce(o.acesso, 'ativo') = 'ativo'
$$;
grant execute on function public.loja_publica(text) to anon, authenticated;

-- ----------------------------------------------------------- C-1: signup seguro
-- Lê org_id/role SOMENTE de app_metadata (raw_app_meta_data), nunca de
-- user_metadata. O cliente não consegue gravar app_metadata via signUp; só o
-- service_role (rotas servidor) define. owner nunca entra por convite.
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

  convite_role := nullif(new.raw_app_meta_data->>'role', '');

  -- revendedora: o vínculo (revendedora.user_id) é feito pela rota de ativação;
  -- ela fica isolada das tabelas e só acessa via RPC.
  if convite_role = 'revendedora' then
    return new;
  end if;

  -- convite de membro interno: SÓ vendedor/motoboy, e SÓ via app_metadata.
  convite_org := nullif(new.raw_app_meta_data->>'org_id', '')::uuid;
  if convite_org is not null and convite_role in ('vendedor', 'motoboy') then
    insert into public.usuario (id, org_id, nome, email, role)
    values (new.id, convite_org, new.raw_user_meta_data->>'nome', new.email, convite_role);
    return new;
  end if;

  -- signup self-service (sem app_metadata de convite): cria loja nova + owner.
  insert into public.org (nome)
  values (coalesce(nullif(new.raw_user_meta_data->>'nome_loja', ''), 'Minha Loja'))
  returning id into nova_org;
  insert into public.usuario (id, org_id, nome, email)
  values (new.id, nova_org, new.raw_user_meta_data->>'nome', new.email);
  return new;
end;
$$;
