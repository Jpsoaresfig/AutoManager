-- ============================================================================
-- LOTE 3 — A-3: trial único.
-- /api/onboarding/plano reescrevia status='trialing' + trial_ate=now()+1mês a
-- cada chamada, sem checar consumo. Qualquer owner renovava Expansão grátis
-- indefinidamente. Agora o período gratuito é concedido UMA vez (flag
-- trial_consumido); chamadas seguintes só trocam o plano dentro do trial vigente.
-- ============================================================================

alter table public.assinatura
  add column if not exists trial_consumido boolean not null default false;

-- backfill: quem já passou do onboarding já consumiu o período gratuito.
update public.assinatura a
  set trial_consumido = true
  from public.org o
  where o.id = a.org_id
    and coalesce(o.onboarding_completo, false) = true
    and a.trial_consumido = false;
