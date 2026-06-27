-- ============================================================================
-- Código de convite de uso único para a revendedora (endurece o §7 do README).
--
-- Antes: o dono marcava acesso_liberado = true e a revendedora ativava só com
-- o e-mail. Havia uma janela em que alguém que conhecesse o e-mail poderia
-- reivindicá-lo antes da 1ª senha.
--
-- Agora: liberar o acesso gera um CÓDIGO curto, com validade, que o dono passa
-- para a revendedora (junto do link /acesso). A ativação exige e-mail + código.
-- O código é de uso único: some assim que a conta é ativada (a rota /ativar o
-- limpa) e expira sozinho. Quem não tem o código não consegue ativar.
-- ============================================================================

alter table public.revendedora
  add column if not exists acesso_codigo text,
  add column if not exists acesso_codigo_expira timestamptz;

-- gera um código curto, legível (sem caracteres ambíguos: 0/O, 1/I/L).
create or replace function private.gerar_codigo_acesso()
returns text
language sql
volatile
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 30)::int + 1, 1),
    ''
  )
  from generate_series(1, 6);
$$;

-- ------------------------------------------------------------ liberar_revendedora
-- Dono libera o 1º acesso: gera (ou regenera) o código e devolve para ele
-- compartilhar. Valida que o chamador é dono da própria loja e que a
-- revendedora ainda não ativou (user_id null).
create or replace function public.liberar_revendedora(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := private.current_org_id();
  v_role text := private.current_role();
  v_rev public.revendedora;
  v_codigo text;
  v_expira timestamptz;
begin
  if v_org is null or v_role <> 'owner' then raise exception 'sem_permissao'; end if;

  select * into v_rev from public.revendedora where id = p_id and org_id = v_org;
  if v_rev.id is null then raise exception 'revendedora_invalida'; end if;
  if v_rev.user_id is not null then raise exception 'ja_ativada'; end if;
  if coalesce(v_rev.email, '') = '' then raise exception 'sem_email'; end if;

  v_codigo := private.gerar_codigo_acesso();
  v_expira := now() + interval '7 days';

  update public.revendedora
    set acesso_liberado = true,
        acesso_codigo = v_codigo,
        acesso_codigo_expira = v_expira
    where id = p_id;

  return json_build_object('codigo', v_codigo, 'expira', v_expira);
end;
$$;
grant execute on function public.liberar_revendedora(uuid) to authenticated;

-- ------------------------------------------------------------ revogar_revendedora
-- Cancela a liberação: zera o código e desliga o acesso_liberado.
create or replace function public.revogar_revendedora(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := private.current_org_id();
  v_role text := private.current_role();
begin
  if v_org is null or v_role <> 'owner' then raise exception 'sem_permissao'; end if;

  update public.revendedora
    set acesso_liberado = false,
        acesso_codigo = null,
        acesso_codigo_expira = null
    where id = p_id and org_id = v_org;

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.revogar_revendedora(uuid) to authenticated;
