-- ============================================================================
-- LOTE 5 — BAIXOS.
-- B-3  Divergência de duração do trial: criar_assinatura_org dava 14 dias, mas o
--      onboarding concede 1 mês. Alinha o trial inicial a 30 dias.
-- ============================================================================

create or replace function private.criar_assinatura_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.assinatura (org_id, plano, status, preco_centavos, trial_ate)
  values (NEW.id, 'solo', 'trialing', 4900, now() + interval '30 days')
  on conflict (org_id) do nothing;
  return NEW;
end $$;
