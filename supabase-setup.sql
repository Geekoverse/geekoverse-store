-- GEEKO / geekoverse-store — setup Supabase
-- Rode em: Supabase Dashboard > SQL Editor > New query > Run
-- Depois recarregue o site: o aviso amarelo some e o /admin centraliza pros 4.

create table if not exists products (
  id text primary key,
  slug text unique not null,
  name text not null,
  description text default '',
  price numeric not null default 0,
  kind text not null default 'camiseta',
  category text default '',
  images jsonb default '[]',
  sizes text[] default '{P,M,G,GG}',
  colors jsonb default '[]',
  active boolean default true,
  featured boolean default false,
  created_at timestamptz default now()
);

alter table products enable row level security;

drop policy if exists "leitura publica" on products;
create policy "leitura publica"
on products for select to anon, authenticated using (true);

drop policy if exists "escrita equipe" on products;
create policy "escrita equipe"
on products for all to anon, authenticated
using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('mockups','mockups', true)
on conflict (id) do nothing;

-- Opcional: produto de exemplo (rode 1x para testar)
-- insert into products (id, slug, name, description, price, kind, category, images, sizes, colors, active, featured)
-- values (
--   'GKV-CAM-001', 'extra-life', 'Extra Life',
--   'Um 1-UP quase invisivel. Minimalista frente + verso.',
--   89.9, 'camiseta', 'Games',
--   '[{"src":"/logo.jpeg","alt":"Extra Life — frente"}]',
--   '{P,M,G,GG}',
--   '[{"id":"preta","name":"Preta","hex":"#111111"}]',
--   true, true
-- ) on conflict (slug) do nothing;
