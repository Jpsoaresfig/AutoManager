-- Modelo financeiro: forma de pagamento, status de pagamento (pago/fiado),
-- desconto e data do pagamento (para separar competência × caixa).

alter table public.venda
  add column if not exists forma_pagamento text not null default 'dinheiro',  -- dinheiro|pix|credito|debito
  add column if not exists status_pagamento text not null default 'paga',       -- paga|pendente|cancelada
  add column if not exists desconto numeric(12,2) not null default 0,
  add column if not exists data_pagamento timestamptz;

-- vendas já existentes consideradas pagas na data da venda
update public.venda set data_pagamento = data where data_pagamento is null and status_pagamento = 'paga';
