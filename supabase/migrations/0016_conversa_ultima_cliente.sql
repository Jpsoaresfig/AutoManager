-- Inbox da loja com "não lidas": precisamos saber quando o CLIENTE mandou a última
-- mensagem em cada conversa. Trigger mantém ultima_em (qualquer msg) e
-- ultima_cliente_em (só msgs do cliente) sempre atualizados.

alter table public.conversa
  add column if not exists ultima_cliente_em timestamptz;

create or replace function private.bump_conversa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversa set
    ultima_em = NEW.criada_em,
    ultima_cliente_em = case when NEW.autor_tipo = 'cliente' then NEW.criada_em else ultima_cliente_em end
  where id = NEW.conversa_id;
  return NEW;
end $$;

drop trigger if exists trg_bump_conversa on public.mensagem;
create trigger trg_bump_conversa after insert on public.mensagem
  for each row execute function private.bump_conversa();

-- backfill do histórico existente
update public.conversa c set
  ultima_cliente_em = sub.max_cliente,
  ultima_em = greatest(c.ultima_em, coalesce(sub.max_all, c.ultima_em))
from (
  select conversa_id,
         max(criada_em) filter (where autor_tipo = 'cliente') as max_cliente,
         max(criada_em) as max_all
  from public.mensagem group by conversa_id
) sub
where sub.conversa_id = c.id;
