-- Phase 1 baseline: declare every table the app reads/writes.
-- Idempotent — safe to run against an existing database. Uses CREATE TABLE
-- IF NOT EXISTS and ALTER TABLE ADD COLUMN IF NOT EXISTS so a table that
-- already exists in production is not touched beyond missing columns.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Lookup: crop_types
-- ---------------------------------------------------------------------------
create table if not exists public.crop_types (
  id            uuid        primary key default gen_random_uuid(),
  name_en       text        not null,
  name_km       text,
  category      text,
  default_unit  text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Farms
-- ---------------------------------------------------------------------------
create table if not exists public.farms (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  name            text        not null,
  location        text,
  total_area_ha   numeric,
  boundary        jsonb,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Zones
-- ---------------------------------------------------------------------------
create table if not exists public.zones (
  id                    uuid        primary key default gen_random_uuid(),
  farm_id               uuid        not null references public.farms (id) on delete cascade,
  user_id               uuid        not null references auth.users (id) on delete cascade,
  name                  text        not null,
  area_ha               numeric,
  crop_type_id          uuid        references public.crop_types (id) on delete set null,
  planting_density      numeric,
  tree_count            integer,
  avg_tree_age_years    numeric,
  variety               text,
  boundary              jsonb,
  created_at            timestamptz not null default now()
);

alter table public.zones add column if not exists user_id uuid;
alter table public.zones add column if not exists crop_type_id uuid;
alter table public.zones add column if not exists planting_density numeric;

-- ---------------------------------------------------------------------------
-- Harvests
-- ---------------------------------------------------------------------------
create table if not exists public.harvests (
  id              uuid        primary key default gen_random_uuid(),
  zone_id         uuid        not null references public.zones (id) on delete cascade,
  user_id         uuid        not null references auth.users (id) on delete cascade,
  harvest_date    date        not null,
  quantity        numeric     not null,
  unit            text,
  quality_grade   text,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.harvests add column if not exists user_id uuid;

-- ---------------------------------------------------------------------------
-- Harvest quality metrics (child of harvests)
-- ---------------------------------------------------------------------------
create table if not exists public.harvest_quality_metrics (
  id            uuid        primary key default gen_random_uuid(),
  harvest_id    uuid        not null references public.harvests (id) on delete cascade,
  metric_name   text        not null,
  metric_value  numeric     not null,
  unit          text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Irrigation logs
-- ---------------------------------------------------------------------------
create table if not exists public.irrigation_logs (
  id                uuid        primary key default gen_random_uuid(),
  zone_id           uuid        not null references public.zones (id) on delete cascade,
  user_id           uuid        not null references auth.users (id) on delete cascade,
  irrigation_date   date        not null,
  method            text,
  duration_minutes  integer,
  water_source      text,
  notes             text,
  created_at        timestamptz not null default now()
);

alter table public.irrigation_logs add column if not exists user_id uuid;

-- ---------------------------------------------------------------------------
-- Plantation batches
-- ---------------------------------------------------------------------------
create table if not exists public.plantation_batches (
  id              uuid        primary key default gen_random_uuid(),
  zone_id         uuid        not null references public.zones (id) on delete cascade,
  user_id         uuid        not null references auth.users (id) on delete cascade,
  planting_year   integer,
  variety         text,
  tree_count      integer,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.plantation_batches add column if not exists user_id uuid;

-- ---------------------------------------------------------------------------
-- Yield forecasts (per zone, per month)
-- ---------------------------------------------------------------------------
create table if not exists public.yield_forecasts (
  id                            uuid        primary key default gen_random_uuid(),
  zone_id                       uuid        not null references public.zones (id) on delete cascade,
  forecast_month                date        not null,
  expected_yield_kg_per_ha      numeric,
  confidence_score              numeric,
  model_version                 text,
  created_at                    timestamptz not null default now(),
  unique (zone_id, forecast_month)
);

-- ---------------------------------------------------------------------------
-- i18n string overrides (merged on top of fallback translations in code)
-- ---------------------------------------------------------------------------
create table if not exists public.i18n_strings (
  key         text        primary key,
  en          text,
  km          text,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpful indexes for common query shapes
-- ---------------------------------------------------------------------------
create index if not exists farms_user_id_idx              on public.farms (user_id);
create index if not exists zones_farm_id_idx              on public.zones (farm_id);
create index if not exists zones_user_id_idx              on public.zones (user_id);
create index if not exists harvests_zone_id_idx           on public.harvests (zone_id);
create index if not exists harvests_user_id_idx           on public.harvests (user_id);
create index if not exists harvests_harvest_date_idx      on public.harvests (harvest_date);
create index if not exists irrigation_logs_zone_id_idx    on public.irrigation_logs (zone_id);
create index if not exists plantation_batches_zone_id_idx on public.plantation_batches (zone_id);
create index if not exists yield_forecasts_zone_id_idx    on public.yield_forecasts (zone_id);
create index if not exists harvest_quality_metrics_harvest_id_idx
  on public.harvest_quality_metrics (harvest_id);
