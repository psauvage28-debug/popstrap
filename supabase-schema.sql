-- A coller une seule fois dans Supabase : SQL Editor -> New query -> colle tout -> Run

create table if not exists products (
  id bigint generated always as identity primary key,
  handle text unique,
  title text not null,
  description text default '',
  price_cents integer not null default 0,
  compare_at_price_cents integer,
  currency text not null default 'EUR',
  image_url text default '',
  gallery jsonb default '[]',
  colors jsonb default '[]',
  collection text,
  stock integer not null default 0,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists orders (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_ref text,
  customer_email text,
  total_cents integer not null,
  currency text not null default 'EUR',
  status text not null default 'pending',
  items_json jsonb not null,
  shipping_address jsonb,
  created_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value text
);

-- Migrations (sans effet si deja appliquees) :
alter table orders add column if not exists shipping_address jsonb;
alter table products add column if not exists collection text;
