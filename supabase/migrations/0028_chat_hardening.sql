-- ============================================================================
-- Endurece o chat da vitrine pública (cliente anônimo) e os buckets de imagem.
--
-- Furos fechados:
--  * conversa: visitante podia INSERIR conversa para QUALQUER org_id, inclusive
--    lojas inativas -> spam/flood cross-tenant no inbox alheio. Agora só cria
--    conversa para loja existente e ATIVA.
--  * conversa: UPDATE sem trava permitia trocar org_id/cliente_id (injetar a
--    conversa no inbox de outra loja). Agora essas colunas são imutáveis.
--  * mensagem: cliente podia se passar pela "loja" (autor_tipo='loja') e mandar
--    texto gigante. Agora autor_tipo é amarrado ao papel, há limite de tamanho
--    e a org da mensagem precisa bater com a da conversa.
--  * buckets de imagem sem limite de tipo/tamanho -> abuso de storage / SVG.
-- ============================================================================

-- conversa: só cria para loja existente e ATIVA (e como o próprio cliente).
drop policy if exists conversa_insert on public.conversa;
create policy conversa_insert on public.conversa for insert to authenticated
  with check (
    cliente_id = (select auth.uid())
    and exists (select 1 from public.org o where o.id = org_id and o.loja_ativa)
  );

-- conversa: org_id e cliente_id são imutáveis (impede sequestro p/ outro inbox).
create or replace function private.conversa_imutavel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.org_id <> OLD.org_id or NEW.cliente_id <> OLD.cliente_id then
    raise exception 'conversa_imutavel';
  end if;
  return NEW;
end $$;
drop trigger if exists trg_conversa_imutavel on public.conversa;
create trigger trg_conversa_imutavel before update on public.conversa
  for each row execute function private.conversa_imutavel();

-- mensagem: cap de tamanho no banco (defesa em profundidade, vale p/ todo caminho).
do $$ begin
  alter table public.mensagem add constraint mensagem_texto_len check (char_length(texto) <= 4000);
exception when duplicate_object then null; end $$;

-- mensagem: autor_tipo amarrado ao papel (cliente só 'cliente', dono só 'loja'),
-- texto não-vazio e dentro do limite, e org_id batendo com a da conversa.
drop policy if exists mensagem_insert on public.mensagem;
create policy mensagem_insert on public.mensagem for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and char_length(texto) between 1 and 2000
    and org_id = (select c.org_id from public.conversa c where c.id = conversa_id)
    and exists (
      select 1 from public.conversa c where c.id = conversa_id and (
        (c.cliente_id = (select auth.uid()) and autor_tipo = 'cliente')
        or (c.org_id = private.current_org_id() and private.current_role() = 'owner' and autor_tipo = 'loja')
      )
    )
  );

-- buckets de imagem: limita tipo e tamanho no servidor (reforça lib/imagem.ts).
update storage.buckets
  set file_size_limit = 5242880,  -- 5 MB
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
  where id in ('lojas','produtos');
