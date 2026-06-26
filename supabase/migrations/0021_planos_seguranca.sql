-- ============================================================================
-- Segurança dos planos: fecha a troca de plano "de graça" pelo cliente.
--
-- Até aqui, public.mudar_plano(text) tinha grant para `authenticated`, então
-- qualquer OWNER podia chamar a RPC direto (ex.: pelo console) e virar EXPANSAO
-- sem pagar. O fluxo oficial agora é:
--   * cliente paga  -> webhook do Mercado Pago aplica o plano (service_role)
--   * cortesia/suporte -> super-admin via /api/admin/plano (service_role)
-- Em ambos os casos a alteração é feita com service_role, que IGNORA estes grants.
-- Logo, revogar o execute do cliente não quebra nada e fecha o buraco.
-- ============================================================================

revoke execute on function public.mudar_plano(text) from authenticated;
revoke execute on function public.mudar_plano(text) from public;
