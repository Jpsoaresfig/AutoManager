-- Categorias personalizadas por loja: cada org define sua própria lista (tamanho livre).
alter table public.org
  add column if not exists categorias text[] not null default '{}'::text[];
