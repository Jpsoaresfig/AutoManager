-- ============================================================================
-- Novo plano de entrada: AMBULANTE (R$ 20/mês) para vendedores de rua.
-- Tem estoque, lojinha virtual, chat e relatórios básicos. NÃO tem revendedoras,
-- vendedores internos, motoboys/entregas nem analytics/ranking.
-- Espelha o lib/plans.ts no banco, no mesmo padrão de 0013/0022.
--
-- Observações de enforcement (já cobertas pelas funções existentes):
--   * private.permite_papel: libera vendedor/motoboy só em equipe/expansao,
--     então AMBULANTE fica naturalmente bloqueado (whitelist).
--   * private.permite_entregas: só EXPANSAO, AMBULANTE bloqueado naturalmente.
-- O que muda aqui: limite de revendedoras = 0 e mudar_plano aceita 'ambulante'.
-- ============================================================================

-- Limite de revendedoras ATIVAS por plano (null = ilimitado). AMBULANTE = 0.
create or replace function private.limite_revendedoras(p_org uuid)
returns int language sql stable security definer set search_path = public as $$
  select case private.plano_efetivo(p_org)
    when 'ambulante' then 0
    when 'solo' then 3
    when 'equipe' then 15
    else null
  end
$$;

-- Troca de plano (RPC) passa a reconhecer AMBULANTE e seu preço (2000 centavos).
-- Continua revogada para `authenticated` (ver 0021): só roda via service_role.
create or replace function public.mudar_plano(p_plano text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := private.current_org_id();
  v_preco int;
begin
  if v_org is null or private.current_role() <> 'owner' then
    raise exception 'sem_permissao';
  end if;
  if p_plano not in ('ambulante','solo','equipe','expansao') then
    raise exception 'plano_invalido';
  end if;
  v_preco := case p_plano
    when 'ambulante' then 2000
    when 'solo' then 4900
    when 'equipe' then 9900
    else 19900
  end;

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
-- mantém a revogação feita em 0021 (a recriação acima não reconcede grants).
revoke execute on function public.mudar_plano(text) from authenticated;
revoke execute on function public.mudar_plano(text) from public;
