-- ═══════════════════════════════════════════════════════════════════
--  MediOrder Pro — Supabase Schema
--  Run this once in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── PROFILES ──────────────────────────────────────────────────────
-- One row per distributor, linked to auth.users
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  biz_name    text,
  slug        text unique,
  phone       text,
  city        text,
  address     text,
  whatsapp    text,
  low_level   int not null default 10,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;

-- Distributors can only read/write their own profile
create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── MEDICINES ─────────────────────────────────────────────────────
create table if not exists medicines (
  id          uuid primary key default gen_random_uuid(),
  dist_id     uuid not null references profiles(id) on delete cascade,
  code        text,
  name        text not null,
  company     text,
  tp          numeric(10,2) not null default 0,
  disc        numeric(5,2) not null default 0,
  -- net is computed server-side, stored for query performance
  net         numeric(10,2) generated always as (
                round(tp * (1 - disc / 100), 2)
              ) stored,
  bonus       text,
  stock       int not null default 999,
  created_at  timestamptz not null default now()
);

create index if not exists idx_medicines_dist_id on medicines(dist_id);
create index if not exists idx_medicines_name    on medicines(dist_id, name);

alter table medicines enable row level security;

-- Distributors manage their own medicines
create policy "Owners manage own medicines"
  on medicines for all
  using (auth.uid() = dist_id)
  with check (auth.uid() = dist_id);

-- Public can read medicines (needed for the pharmacy portal API route)
-- NOTE: reads are done server-side via service_role in /api/portal/[slug]
-- so this policy is belt-and-suspenders and not strictly needed
create policy "Public read medicines"
  on medicines for select
  using (true);

-- ── ORDERS ────────────────────────────────────────────────────────
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  dist_id       uuid not null references profiles(id) on delete cascade,
  pharmacy_name text,
  status        text not null default 'pending'
                  check (status in ('pending','confirmed','completed','cancelled')),
  total_before  numeric(12,2) not null default 0,
  total_after   numeric(12,2) not null default 0,
  item_count    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_orders_dist_id    on orders(dist_id);
create index if not exists idx_orders_created_at on orders(dist_id, created_at desc);
create index if not exists idx_orders_status     on orders(dist_id, status);

alter table orders enable row level security;

-- Only the distributor can read/update their orders
create policy "Owners see own orders"
  on orders for select
  using (auth.uid() = dist_id);

create policy "Owners update own orders"
  on orders for update
  using (auth.uid() = dist_id);

-- Anyone can insert an order (pharmacies placing orders — no auth)
-- The API validates dist_id and medicine ownership before inserting
create policy "Anyone can place order"
  on orders for insert
  with check (true);

-- ── ORDER ITEMS ───────────────────────────────────────────────────
create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  medicine_id uuid references medicines(id) on delete set null,
  name        text not null,
  code        text,
  tp          numeric(10,2) not null,
  disc        numeric(5,2) not null default 0,
  net         numeric(10,2) not null,
  qty         int not null check (qty > 0),
  subtotal    numeric(12,2) not null
);

create index if not exists idx_order_items_order_id on order_items(order_id);

alter table order_items enable row level security;

-- Owner sees items via their orders
create policy "Owner sees own order items"
  on order_items for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_id
      and o.dist_id = auth.uid()
    )
  );

-- Anyone can insert items (validated server-side in /api/orders)
create policy "Anyone can insert order items"
  on order_items for insert
  with check (true);

-- ── HELPER FUNCTION: get order stats for a distributor ────────────
create or replace function get_dist_stats(p_dist_id uuid)
returns table(
  total_orders   bigint,
  pending_orders bigint,
  total_revenue  numeric,
  medicine_count bigint
)
language sql security definer
as $$
  select
    (select count(*)        from orders   where dist_id = p_dist_id)                   as total_orders,
    (select count(*)        from orders   where dist_id = p_dist_id and status='pending') as pending_orders,
    (select coalesce(sum(total_after),0) from orders where dist_id = p_dist_id)        as total_revenue,
    (select count(*)        from medicines where dist_id = p_dist_id)                  as medicine_count
$$;
