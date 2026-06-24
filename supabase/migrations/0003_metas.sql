-- Meta mensal de vendas (R$) por revendedora.
alter table public.revendedora
  add column if not exists meta_mensal numeric(12,2) not null default 0;
