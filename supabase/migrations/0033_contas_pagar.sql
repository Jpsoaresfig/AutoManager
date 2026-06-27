-- ============================================================================
-- Contas a pagar (financeiro completo).
--
-- A caixa de recebimentos (0024) cobre só o que ENTRA. Aqui registramos o que
-- SAI: fornecedores, aluguel, energia, custos recorrentes. Junto com as vendas,
-- fecha o fluxo de caixa do lojista (a receber − a pagar).
--
-- Mesmo padrão tenant das demais tabelas (org_id + RLS por org). Leitura para
-- toda a equipe da loja; escrita só do dono (espelha o resto do financeiro).
-- ============================================================================

create table if not exists public.conta_pagar (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org(id) on delete cascade,
  descricao text not null,
  categoria text,                            -- Fornecedor | Aluguel | Energia | Impostos | Outros…
  fornecedor text,
  valor numeric(12,2) not null,
  vencimento date not null,
  status text not null default 'pendente',   -- pendente | paga
  pago_em timestamptz,
  recorrente boolean not null default false, -- despesa fixa/mensal (rótulo; não gera lançamentos sozinha)
  observacao text,
  criado_em timestamptz not null default now()
);
create index if not exists conta_pagar_org_idx on public.conta_pagar(org_id);
create index if not exists conta_pagar_venc_idx on public.conta_pagar(org_id, status, vencimento);

alter table public.conta_pagar enable row level security;
grant select, insert, update, delete on public.conta_pagar to authenticated;

-- LER: qualquer usuário da loja vê as contas dela.
do $$ begin
  create policy conta_pagar_select on public.conta_pagar for select to authenticated
    using (org_id = private.current_org_id());
exception when duplicate_object then null; end $$;

-- ESCREVER: só o dono (owner) cria/edita/apaga contas da própria loja.
do $$ begin
  create policy conta_pagar_insert on public.conta_pagar for insert to authenticated
    with check (org_id = private.current_org_id() and private.current_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy conta_pagar_update on public.conta_pagar for update to authenticated
    using (org_id = private.current_org_id() and private.current_role() = 'owner')
    with check (org_id = private.current_org_id() and private.current_role() = 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy conta_pagar_delete on public.conta_pagar for delete to authenticated
    using (org_id = private.current_org_id() and private.current_role() = 'owner');
exception when duplicate_object then null; end $$;
