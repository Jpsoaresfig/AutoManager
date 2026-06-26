-- ============================================================================
-- Enforcement REAL do módulo de entregas no banco.
-- A UI já mostra o pitch de upgrade quando o plano não tem entregas (allowEntregas),
-- mas a policy entrega_insert (0006_papeis) só checava org + role = owner.
-- Isso deixava o paywall furável via API direta. Aqui espelhamos a regra do
-- plans.ts (allowEntregas só no EXPANSAO) no banco, no mesmo padrão do 0013.
-- ============================================================================

-- O plano EFETIVO da org libera entregas? (trial = EXPANSAO, então libera)
create or replace function private.permite_entregas(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.plano_efetivo(p_org) = 'expansao'
$$;

-- Bloqueia criar entrega fora do plano (insert só acontece pelo dono).
create or replace function private.checar_entrega_plano()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not private.permite_entregas(NEW.org_id) then
    raise exception 'entregas_nao_permitidas';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_entrega_plano on public.entrega;
create trigger trg_entrega_plano before insert on public.entrega
  for each row execute function private.checar_entrega_plano();
