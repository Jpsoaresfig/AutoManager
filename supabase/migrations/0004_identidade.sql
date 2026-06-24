-- Identidade da loja: cor da marca + logo (Supabase Storage).

alter table public.org
  add column if not exists cor_marca text,
  add column if not exists logo_url text;

-- bucket público para logos das lojas
insert into storage.buckets (id, name, public)
values ('lojas', 'lojas', true)
on conflict (id) do nothing;

-- leitura pública das logos
drop policy if exists "logo_leitura_publica" on storage.objects;
create policy "logo_leitura_publica" on storage.objects
  for select to public
  using (bucket_id = 'lojas');

-- upload/atualização/remoção apenas na pasta da própria org (nome do arquivo = "<org_id>/...")
drop policy if exists "logo_insert_org" on storage.objects;
create policy "logo_insert_org" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lojas'
    and (storage.foldername(name))[1] = private.current_org_id()::text
  );

drop policy if exists "logo_update_org" on storage.objects;
create policy "logo_update_org" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'lojas'
    and (storage.foldername(name))[1] = private.current_org_id()::text
  );

drop policy if exists "logo_delete_org" on storage.objects;
create policy "logo_delete_org" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lojas'
    and (storage.foldername(name))[1] = private.current_org_id()::text
  );
