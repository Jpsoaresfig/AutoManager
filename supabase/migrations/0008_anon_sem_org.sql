-- Clientes anônimos da vitrine (login anônimo p/ chat) NÃO devem virar org/usuário.
-- Sem isso, cada visitante que abre o chat criaria uma org fantasma.

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
  -- visitante anônimo da loja pública: não cria nada
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  convite_org := nullif(new.raw_user_meta_data->>'org_id', '')::uuid;
  convite_role := nullif(new.raw_user_meta_data->>'role', '');

  if convite_org is not null then
    insert into public.usuario (id, org_id, nome, email, role)
    values (
      new.id, convite_org,
      new.raw_user_meta_data->>'nome', new.email,
      coalesce(convite_role, 'vendedor')
    );
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
