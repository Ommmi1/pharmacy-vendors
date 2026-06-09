-- ═══════════════════════════════════════════════════════════
--  MediOrder Pro v2 — Simplified Schema
--  Run once in Supabase → SQL Editor
--  Drop old tables first if migrating:
--    DROP TABLE IF EXISTS order_items, orders, medicines, profiles CASCADE;
-- ═══════════════════════════════════════════════════════════

-- ── DISTRIBUTORS ──────────────────────────────────────────
create table if not exists distributors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  phone       text,
  whatsapp    text,
  address     text,
  city        text,
  disabled    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table distributors enable row level security;
-- Only authenticated admin can manage distributors
create policy "Admin manages distributors"
  on distributors for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
-- Public can read for portal
create policy "Public reads distributors"
  on distributors for select
  using (true);

-- ── MEDICINES ─────────────────────────────────────────────
create table if not exists medicines (
  id          uuid primary key default gen_random_uuid(),
  dist_id     uuid not null references distributors(id) on delete cascade,
  code        text,
  name        text not null,
  company     text,
  mrp         numeric(10,2) not null default 0,
  tp          numeric(10,2) not null default 0,
  disc        numeric(5,2)  not null default 0,
  net         numeric(10,2) generated always as (
                round(tp * (1 - disc / 100), 2)
              ) stored,
  bonus       text,
  stock       int not null default 999,
  created_at  timestamptz not null default now()
);

create index if not exists idx_medicines_dist_id on medicines(dist_id);

alter table medicines enable row level security;
create policy "Admin manages medicines"
  on medicines for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "Public reads medicines"
  on medicines for select
  using (true);
