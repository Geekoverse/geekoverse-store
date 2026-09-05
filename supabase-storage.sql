-- GEEKO — libera upload/leitura do bucket mockups (imagens dos produtos)
-- Rode em: Supabase Dashboard > SQL Editor > New query > Run
-- Sem isso, o arrastar-imagem do /admin falha com erro de policy.

insert into storage.buckets (id, name, public)
values ('mockups','mockups', true)
on conflict (id) do update set public = true;

drop policy if exists "leitura publica mockups" on storage.objects;
create policy "leitura publica mockups"
on storage.objects for select to anon, authenticated
using (bucket_id = 'mockups');

drop policy if exists "upload mockups" on storage.objects;
create policy "upload mockups"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'mockups');

drop policy if exists "atualizar mockups" on storage.objects;
create policy "atualizar mockups"
on storage.objects for update to anon, authenticated
using (bucket_id = 'mockups');

drop policy if exists "apagar mockups" on storage.objects;
create policy "apagar mockups"
on storage.objects for delete to anon, authenticated
using (bucket_id = 'mockups');
