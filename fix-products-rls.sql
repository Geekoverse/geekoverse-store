-- GEEKO — correção temporária do erro RLS em products
-- "new row violates row-level security policy for table products"
-- Como usar: Supabase Dashboard > SQL Editor > New query > cole tudo > Run.
-- Depois recarregue o /admin (bolinha deve ficar verde) e salve o produto de novo.
-- Pode apagar este arquivo depois de rodar.

-- 1) Diagnóstico (veja o resultado antes de seguir):
select policyname, roles, cmd from pg_policies where tablename = 'products';

-- 2) Correção: recria leitura + escrita p/ anon (padrão do setup original):
alter table products enable row level security;

drop policy if exists "leitura publica" on products;
create policy "leitura publica"
on products for select to anon, authenticated using (true);

drop policy if exists "escrita equipe" on products;
create policy "escrita equipe"
on products for all to anon, authenticated
using (true) with check (true);
