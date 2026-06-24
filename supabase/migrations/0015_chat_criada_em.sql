-- recuperar_conversa passa a devolver criada_em das mensagens, para o storefront
-- calcular "mensagens não lidas" (badge no botão do chat).
create or replace function public.recuperar_conversa(p_org uuid, p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_nome text;
  v_uid uuid := auth.uid();
begin
  if v_uid is null or coalesce(p_token, '') = '' then
    return null;
  end if;

  select id, cliente_nome into v_id, v_nome
  from public.conversa
  where org_id = p_org and cliente_token = p_token
  limit 1;

  if v_id is null then
    return null;
  end if;

  update public.conversa set cliente_id = v_uid where id = v_id and cliente_id <> v_uid;

  return json_build_object(
    'id', v_id,
    'cliente_nome', v_nome,
    'mensagens', coalesce((
      select json_agg(json_build_object(
        'id', m.id, 'autor_tipo', m.autor_tipo, 'texto', m.texto,
        'criada_em', m.criada_em
      ) order by m.criada_em)
      from public.mensagem m where m.conversa_id = v_id
    ), '[]'::json)
  );
end $$;
grant execute on function public.recuperar_conversa(uuid, text) to anon, authenticated;
