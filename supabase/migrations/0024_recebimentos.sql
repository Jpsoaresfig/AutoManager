-- ============================================================================
-- Caixa de entrada de RECEBIMENTOS.
-- Quando cai dinheiro numa conta conectada do dono (Mercado Pago, etc.), o
-- provedor chama nosso webhook e gravamos aqui uma "entrada pendente". O dono
-- vê na caixa de entrada e confirma: "foi venda da loja?" → vira uma `venda`.
-- "Não" → marca recusada (era dinheiro pessoal / transferência).
--
-- Segue o mesmo padrão tenant das demais tabelas (org_id + RLS por org).
-- ============================================================================

create table if not exists public.entrada_pendente (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  valor numeric(12,2) not null,
  origem text not null default 'manual',          -- mercadopago | inter | manual
  descricao text,                                  -- ex.: "Pix recebido", "Venda no Point"
  pagador text,                                    -- nome/e-mail de quem pagou (quando o provedor manda)
  forma_pagamento text not null default 'pix',     -- pix | credito | debito | dinheiro | boleto
  provider_pagamento_id text,                      -- id do pagamento no provedor (idempotência)
  status text not null default 'pendente',         -- pendente | confirmada | recusada
  venda_id uuid references public.venda(id) on delete set null,  -- venda gerada ao confirmar
  recebido_em timestamptz not null default now(),  -- quando o dinheiro caiu
  decidido_em timestamptz,                         -- quando o dono respondeu sim/não
  created_at timestamptz not null default now()
);
create index if not exists entrada_pendente_org_idx on public.entrada_pendente(org_id);
create index if not exists entrada_pendente_status_idx on public.entrada_pendente(org_id, status);

-- idempotência: o mesmo pagamento do provedor não entra duas vezes (reenvio de webhook).
create unique index if not exists entrada_pendente_provider_uq
  on public.entrada_pendente(org_id, provider_pagamento_id)
  where provider_pagamento_id is not null;

alter table public.entrada_pendente enable row level security;
grant select, insert, update, delete on public.entrada_pendente to authenticated;

-- policies tenant (mesma forma das tabelas de 0001): a org enxerga e mexe só no que é dela.
do $$ begin
  create policy entrada_pendente_select on public.entrada_pendente for select to authenticated
    using (org_id = private.current_org_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy entrada_pendente_insert on public.entrada_pendente for insert to authenticated
    with check (org_id = private.current_org_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy entrada_pendente_update on public.entrada_pendente for update to authenticated
    using (org_id = private.current_org_id())
    with check (org_id = private.current_org_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy entrada_pendente_delete on public.entrada_pendente for delete to authenticated
    using (org_id = private.current_org_id());
exception when duplicate_object then null; end $$;

-- realtime: a caixa de entrada acende o badge na hora que um recebimento chega.
do $$ begin
  alter publication supabase_realtime add table public.entrada_pendente;
exception when duplicate_object then null; end $$;
