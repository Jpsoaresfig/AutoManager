-- ============================================================================
-- Aparência personalizável por loja: tema base (paleta de fundo) e fonte do app.
-- A cor da marca (cor_marca) e a fonte da vitrine (loja_fonte) já existem.
-- ============================================================================

alter table public.org add column if not exists tema_base text;  -- escuro | grafite | claro | areia ...
alter table public.org add column if not exists app_fonte text;  -- chave de lib/fontes.ts (poppins, lora, ...)
