-- GEEKO — automação Mercado Pago + Dimona (Dropsimples)
-- Rode em: Supabase Dashboard > SQL Editor > New query > Run
-- Este arquivo NÃO mexe em design. Só estende o banco.
-- É idempotente: pode rodar mais de 1x sem quebrar.

-- ============================================================
-- 1. ADAPTAÇÃO DA TABELA products
-- ============================================================
alter table products
  add column if not exists dimona_sku text default '';

comment on column products.dimona_sku is
  'SKU base da peça na Dimona (ex: CAM-ALG-PRETA-G). Usado como fallback quando não há mapeamento por tamanho/cor.';

alter table products
  add column if not exists print_art_url text default '';

comment on column products.print_art_url is
  'URL pública do PNG em alta resolução da estampa (300 DPI, fundo transparente). A Dimona baixa esse arquivo na produção.';

alter table products
  add column if not exists dimona_variant_skus jsonb default '{}';

comment on column products.dimona_variant_skus is
  'Mapa opcional tamanho/cor -> SKU Dimona. Ex: {"P:preta":"CAM-ALG-PRETA-P","G:preta":"CAM-ALG-PRETA-G","M:cinza":"MOL-CANG-CINZA-M"}. Chave = "TAMANHO:corId". Se vazio, usa dimona_sku.';

-- Garante valor padrão nos produtos antigos (evita NULL no código)
update products set dimona_sku = '' where dimona_sku is null;
update products set print_art_url = '' where print_art_url is null;
update products set dimona_variant_skus = '{}' where dimona_variant_skus is null;

-- ============================================================
-- 2. BUCKET print-arts (artes em alta para a Dimona baixar)
--    Mockups continuam no bucket "mockups". Artes vão aqui.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('print-arts', 'print-arts', true)
on conflict (id) do update set public = true;

drop policy if exists "leitura publica print-arts" on storage.objects;
create policy "leitura publica print-arts"
on storage.objects for select to anon, authenticated
using (bucket_id = 'print-arts');

drop policy if exists "upload print-arts" on storage.objects;
create policy "upload print-arts"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'print-arts');

drop policy if exists "atualizar print-arts" on storage.objects;
create policy "atualizar print-arts"
on storage.objects for update to anon, authenticated
using (bucket_id = 'print-arts');

drop policy if exists "apagar print-arts" on storage.objects;
create policy "apagar print-arts"
on storage.objects for delete to anon, authenticated
using (bucket_id = 'print-arts');

-- ============================================================
-- 3. TABELA orders — um pedido por checkout Mercado Pago
-- ============================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  -- Mercado Pago
  mp_preference_id text,
  mp_payment_id text unique,
  mp_external_reference text,
  mp_status text default 'pending',
  -- Cliente
  customer_name text default '',
  customer_email text default '',
  customer_phone text default '',
  customer_cpf text default '',
  -- Entrega
  ship_zipcode text default '',
  ship_street text default '',
  ship_number text default '',
  ship_complement text default '',
  ship_district text default '',
  ship_city text default '',
  ship_uf text default '',
  -- Valores
  subtotal numeric default 0,
  freight numeric default 0,
  total_amount numeric default 0,
  -- Dimona
  dimona_order_id text,
  dimona_status text default 'pending',
  dimona_payload jsonb,
  dimona_response jsonb,
  dimona_error text,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_orders_mp_payment on orders (mp_payment_id);
create index if not exists idx_orders_external_ref on orders (mp_external_reference);
create index if not exists idx_orders_status on orders (mp_status);

alter table orders enable row level security;

-- Leitura/escrita via service_role (webhook) bypassa RLS.
-- Libera insert público apenas para criação de pedido pelo checkout.
-- Se preferir travar tudo, remova a policy de insert e crie via Edge Function.
drop policy if exists "checkout cria pedido" on orders;
create policy "checkout cria pedido"
on orders for insert to anon, authenticated
with check (true);

drop policy if exists "leitura propria por referencia" on orders;
create policy "leitura propria por referencia"
on orders for select to anon, authenticated
using (true);

drop policy if exists "service atualiza pedido" on orders;
create policy "service atualiza pedido"
on orders for update to anon, authenticated
using (true) with check (true);

-- ============================================================
-- 4. TABELA order_items — snapshot do que foi comprado
--    (congela dimona_sku + print_art_url no momento da venda)
-- ============================================================
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_slug text default '',
  product_name text default '',
  size text default '',
  color_id text default '',
  color_name text default '',
  quantity int default 1,
  unit_price numeric default 0,
  -- Snapshot Dimona (resolvido no checkout, não depende de edição futura do produto)
  dimona_sku text default '',
  print_art_url text default '',
  created_at timestamptz default now()
);

create index if not exists idx_order_items_order on order_items (order_id);

alter table order_items enable row level security;

drop policy if exists "checkout cria itens" on order_items;
create policy "checkout cria itens"
on order_items for insert to anon, authenticated
with check (true);

drop policy if exists "leitura itens" on order_items;
create policy "leitura itens"
on order_items for select to anon, authenticated
using (true);

-- ============================================================
-- 5. TABELA webhook_events — log + idempotência
-- ============================================================
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text default 'mercadopago',
  event_type text default '',
  resource_id text default '',
  payload jsonb,
  processed boolean default false,
  error text,
  created_at timestamptz default now()
);

create unique index if not exists uq_webhook_source_resource
on webhook_events (source, resource_id)
where resource_id <> '';

alter table webhook_events enable row level security;

drop policy if exists "webhook insert" on webhook_events;
create policy "webhook insert"
on webhook_events for insert to anon, authenticated
with check (true);

drop policy if exists "webhook select" on webhook_events;
create policy "webhook select"
on webhook_events for select to anon, authenticated
using (true);

drop policy if exists "webhook update" on webhook_events;
create policy "webhook update"
on webhook_events for update to anon, authenticated
using (true) with check (true);

-- ============================================================
-- 6. updated_at automático em orders
-- ============================================================
create or replace function set_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row execute function set_orders_updated_at();
