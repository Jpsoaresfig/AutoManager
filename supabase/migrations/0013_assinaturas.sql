-- ============================================================================
-- Sistema de assinaturas por loja (SOLO / EQUIPE / EXPANSAO) com enforcement.
-- A tabela public.assinatura é a fonte da verdade do plano. org.plano sai de cena.
-- Planos efetivos consideram trial (trial = acesso EXPANSAO por 14 dias).
-- ============================================================================

create table if not exists public.assinatura (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.org(id) on delete cascade,
  plano text not null default 'solo',            -- solo | equipe | expansao
  status text not null default 'trialing',       -- trialing | active | past_due | canceled
  preco_centavos int not null default 4900,
  periodo text not null default 'mensal',        -- mensal | anual
  data_inicio timestamptz not null default now(),
  data_fim timestamptz,                          -- fim do ciclo pago (cobrança futura)
  trial_ate timestamptz,                         -- enquanto > now() e status trialing => acesso EXPANSAO
  -- ganchos para gateway de pagamento (Stripe / Mercado Pago / Asaas)
  provider text,
  provider_cliente_id text,
  provider_assinatura_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assinatura_org_idx on public.assinatura(org_id);

alter table public.assinatura enable row level security;
grant select on public.assinatura to authenticated;

-- a org inteira enxerga a própria assinatura; alteração só via RPC (mudar_plano).
drop policy if exists assinatura_select on public.assinatura;
create policy assinatura_select on public.assinatura for select to authenticated
  using (org_id = private.current_org_id());

-- ---------------------------------------------------------------- helpers (private)
-- Plano EFETIVO: durante o trial vale EXPANSAO; senão, o plano contratado.
create or replace function private.plano_efetivo(p_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when a.status = 'trialing' and a.trial_ate is not null and a.trial_ate > now() then 'expansao'
    else a.plano
  end
  from public.assinatura a
  where a.org_id = p_org
$$;

-- Limite de revendedoras ATIVAS (null = ilimitado).
create or replace function private.limite_revendedoras(p_org uuid)
returns int language sql stable security definer set search_path = public as $$
  select case private.plano_efetivo(p_org)
    when 'solo' then 3
    when 'equipe' then 15
    else null
  end
$$;

-- Plano permite criar este papel interno?
create or replace function private.permite_papel(p_org uuid, p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_role = 'vendedor' then private.plano_efetivo(p_org) in ('equipe','expansao')
    when p_role = 'motoboy'  then private.plano_efetivo(p_org) = 'expansao'
    else true
  end
$$;

-- ---------------------------------------------------------------- enforcement (triggers)
-- Bloqueia revendedora ativa acima do limite do plano (insert ou reativação).
create or replace function private.checar_limite_revendedora()
returns trigger language plpgsql security definer set search_path = public as $$
declare lim int;
begin
  if NEW.ativa and (TG_OP = 'INSERT' or not coalesce(OLD.ativa, false)) then
    lim := private.limite_revendedoras(NEW.org_id);
    if lim is not null and (
      select count(*) from public.revendedora
      where org_id = NEW.org_id and ativa and id <> NEW.id
    ) >= lim then
      raise exception 'limite_revendedoras' using detail = lim::text;
    end if;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_limite_revendedora on public.revendedora;
create trigger trg_limite_revendedora before insert or update on public.revendedora
  for each row execute function private.checar_limite_revendedora();

-- Bloqueia criar vendedor/motoboy fora do plano.
create or replace function private.checar_papel_membro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.role in ('vendedor','motoboy') and not private.permite_papel(NEW.org_id, NEW.role) then
    raise exception 'papel_nao_permitido' using detail = NEW.role;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_papel_membro on public.usuario;
create trigger trg_papel_membro before insert on public.usuario
  for each row execute function private.checar_papel_membro();

-- ---------------------------------------------------------------- assinatura automática
-- Toda org nova nasce em SOLO com TRIAL de EXPANSAO por 14 dias.
create or replace function private.criar_assinatura_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.assinatura (org_id, plano, status, preco_centavos, trial_ate)
  values (NEW.id, 'solo', 'trialing', 4900, now() + interval '14 days')
  on conflict (org_id) do nothing;
  return NEW;
end $$;
drop trigger if exists trg_assinatura_org on public.org;
create trigger trg_assinatura_org after insert on public.org
  for each row execute function private.criar_assinatura_org();

-- ---------------------------------------------------------------- troca de plano (RPC)
create or replace function public.mudar_plano(p_plano text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := private.current_org_id();
  v_preco int;
begin
  if v_org is null or private.current_role() <> 'owner' then
    raise exception 'sem_permissao';
  end if;
  if p_plano not in ('solo','equipe','expansao') then
    raise exception 'plano_invalido';
  end if;
  v_preco := case p_plano when 'solo' then 4900 when 'equipe' then 9900 else 19900 end;

  update public.assinatura
     set plano = p_plano,
         status = 'active',
         preco_centavos = v_preco,
         trial_ate = null,
         data_inicio = now(),
         updated_at = now()
   where org_id = v_org;

  return json_build_object('plano', p_plano, 'status', 'active');
end $$;
grant execute on function public.mudar_plano(text) to authenticated;

-- ---------------------------------------------------------------- migração dos dados
-- Cria assinatura p/ orgs existentes a partir do antigo org.plano (sem trial: já são clientes).
insert into public.assinatura (org_id, plano, status, preco_centavos, trial_ate, data_inicio)
select o.id,
  case o.plano when 'vendedor' then 'equipe' when 'entregas' then 'expansao' else 'solo' end,
  'active',
  case o.plano when 'vendedor' then 9900 when 'entregas' then 19900 else 4900 end,
  null, now()
from public.org o
where not exists (select 1 from public.assinatura a where a.org_id = o.id);

-- org passa a guardar só dados da loja.
alter table public.org drop column if exists plano;
