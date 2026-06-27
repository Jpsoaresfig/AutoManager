-- ============================================================================
-- Pool de entregas para o motoboy (fluxo "pegar / devolver").
--
-- Antes (0006): o motoboy só ENXERGAVA e atualizava as entregas já atribuídas a
-- ele (motoboy_id = auth.uid()). Não dava para o dono jogar entregas num "balcão"
-- e o motoboy escolher quais pegar.
--
-- Agora: o motoboy também vê as entregas SEM DONO (motoboy_id is null) da loja e
-- pode reivindicá-las (claim) ou devolvê-las. A trava de escrita garante que ele
-- só consegue deixar a entrega consigo mesmo ou solta (nunca atribuir a outro).
-- O dono continua com controle total. Realtime ligado p/ o balcão ficar vivo.
-- ============================================================================

-- VER: dono vê tudo; motoboy vê as suas + as disponíveis (sem dono).
drop policy if exists entrega_select on public.entrega;
create policy entrega_select on public.entrega for select to authenticated
  using (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or motoboy_id = (select auth.uid())
      or (private.current_role() = 'motoboy' and motoboy_id is null)
    )
  );

-- ATUALIZAR: dono qualquer; motoboy só nas suas ou nas disponíveis, e o
-- resultado precisa ficar consigo (claim) ou solto (devolver) — nunca em outro.
drop policy if exists entrega_update on public.entrega;
create policy entrega_update on public.entrega for update to authenticated
  using (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or motoboy_id = (select auth.uid())
      or (private.current_role() = 'motoboy' and motoboy_id is null)
    )
  )
  with check (
    org_id = private.current_org_id()
    and (
      private.current_role() = 'owner'
      or (private.current_role() = 'motoboy'
          and (motoboy_id = (select auth.uid()) or motoboy_id is null))
    )
  );

-- realtime: o balcão de entregas atualiza na hora (nova entrega, alguém pegou, status mudou).
do $$ begin
  alter publication supabase_realtime add table public.entrega;
exception when duplicate_object then null; end $$;
