-- ============================================================================
-- LOTE 4 - MÉDIOS de segurança/escala.
--
-- M-1   Entregas existentes continuavam operáveis pelo motoboy após o plano cair
--       abaixo de Expansão (a criação já era barrada por trg_entrega_plano, mas
--       claim/status/devolver não). Agora as policies do motoboy exigem
--       private.permite_entregas(org_id).
--
-- M-10  Código de convite da revendedora usava random() (não-CSPRNG) e 6 chars.
--       Agora usa gen_random_bytes (pgcrypto) e 8 chars.
--
-- M-11  Chat público sem limite permitia flood de conversas/mensagens (spam/DoS
--       no inbox). Rate-limit por cliente/conversa em janela de tempo.
-- ============================================================================

-- -------------------------------------------------------- M-1: entregas + plano
drop policy if exists entrega_select on public.entrega;
create policy entrega_select on public.entrega for select to authenticated
  using (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or (
        private.current_role() = 'motoboy'
        and private.permite_entregas(org_id)
        and (motoboy_id = (select auth.uid()) or motoboy_id is null)
      )
    )
  );

drop policy if exists entrega_update on public.entrega;
create policy entrega_update on public.entrega for update to authenticated
  using (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or (
        private.current_role() = 'motoboy'
        and private.permite_entregas(org_id)
        and (motoboy_id = (select auth.uid()) or motoboy_id is null)
      )
    )
  )
  with check (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or (
        private.current_role() = 'motoboy'
        and private.permite_entregas(org_id)
        and (motoboy_id = (select auth.uid()) or motoboy_id is null)
      )
    )
  );

-- ------------------------------------------------------- M-10: código via CSPRNG
create or replace function private.gerar_codigo_acesso()
returns text
language plpgsql
volatile
as $$
declare
  alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- sem 0/O/1/I/L ambíguos
  n int := length(alfabeto);
  bytes bytea := gen_random_bytes(8);                   -- CSPRNG (pgcrypto)
  saida text := '';
  i int;
begin
  for i in 0..7 loop
    saida := saida || substr(alfabeto, (get_byte(bytes, i) % n) + 1, 1);
  end loop;
  return saida;
end;
$$;

-- --------------------------------------------------------- M-11: rate-limit chat
-- limite de novas conversas por cliente (anon) por hora.
create or replace function private.rate_limit_conversa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.cliente_id is not null and (
    select count(*) from public.conversa
    where cliente_id = NEW.cliente_id and criada_em > now() - interval '1 hour'
  ) >= 8 then
    raise exception 'rate_limit_conversa';
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_rate_limit_conversa on public.conversa;
create trigger trg_rate_limit_conversa before insert on public.conversa
  for each row execute function private.rate_limit_conversa();

-- limite de mensagens do cliente por conversa por minuto.
create or replace function private.rate_limit_mensagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.autor_tipo = 'cliente' and (
    select count(*) from public.mensagem
    where conversa_id = NEW.conversa_id and autor_tipo = 'cliente'
      and criada_em > now() - interval '1 minute'
  ) >= 20 then
    raise exception 'rate_limit_mensagem';
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_rate_limit_mensagem on public.mensagem;
create trigger trg_rate_limit_mensagem before insert on public.mensagem
  for each row execute function private.rate_limit_mensagem();
