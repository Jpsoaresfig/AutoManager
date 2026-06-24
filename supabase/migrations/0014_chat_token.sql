-- Chat persistente por cliente: a conversa passa a ter um token estável (guardado
-- no localStorage do visitante). Mesmo que a sessão anônima mude (outra aba, novo
-- login anônimo), o cliente recupera a MESMA conversa pelo token.

alter table public.conversa
  add column if not exists cliente_token text;
create index if not exists conversa_token_idx on public.conversa(org_id, cliente_token);

-- Recupera a conversa pelo token e a "readota" para o auth.uid() atual,
-- mantendo a RLS válida para leituras/escritas seguintes. SECURITY DEFINER
-- para achar por token mesmo quando o uid anônimo mudou.
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

  -- religa ao cliente atual se o anônimo mudou (outra aba / nova sessão)
  update public.conversa set cliente_id = v_uid where id = v_id and cliente_id <> v_uid;

  return json_build_object(
    'id', v_id,
    'cliente_nome', v_nome,
    'mensagens', coalesce((
      select json_agg(json_build_object('id', m.id, 'autor_tipo', m.autor_tipo, 'texto', m.texto) order by m.criada_em)
      from public.mensagem m where m.conversa_id = v_id
    ), '[]'::json)
  );
end $$;
grant execute on function public.recuperar_conversa(uuid, text) to anon, authenticated;
