-- Phase 1 security: enable RLS on every user-owned table and install
-- owner-scoped policies. Re-runnable — policies are dropped before create.
--
-- Ownership models:
--   profiles:               auth.uid() = id
--   farms:                  auth.uid() = user_id
--   zones:                  auth.uid() = user_id
--   harvests:               auth.uid() = user_id
--   irrigation_logs:        auth.uid() = user_id
--   plantation_batches:     auth.uid() = user_id
--   harvest_quality_metrics: through parent harvest.user_id
--   yield_forecasts:        through parent zone.user_id
--
-- crop_types + i18n_strings stay readable by everyone (lookup / translation
-- tables). Only service role may write.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.farms                   enable row level security;
alter table public.zones                   enable row level security;
alter table public.harvests                enable row level security;
alter table public.irrigation_logs         enable row level security;
alter table public.plantation_batches      enable row level security;
alter table public.harvest_quality_metrics enable row level security;
alter table public.yield_forecasts         enable row level security;
alter table public.crop_types              enable row level security;
alter table public.i18n_strings            enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- farms
-- ---------------------------------------------------------------------------
drop policy if exists farms_select_own on public.farms;
drop policy if exists farms_insert_own on public.farms;
drop policy if exists farms_update_own on public.farms;
drop policy if exists farms_delete_own on public.farms;

create policy farms_select_own on public.farms
  for select using (auth.uid() = user_id);

create policy farms_insert_own on public.farms
  for insert with check (auth.uid() = user_id);

create policy farms_update_own on public.farms
  for update using (auth.uid() = user_id);

create policy farms_delete_own on public.farms
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- zones
-- ---------------------------------------------------------------------------
drop policy if exists zones_select_own on public.zones;
drop policy if exists zones_insert_own on public.zones;
drop policy if exists zones_update_own on public.zones;
drop policy if exists zones_delete_own on public.zones;

create policy zones_select_own on public.zones
  for select using (auth.uid() = user_id);

create policy zones_insert_own on public.zones
  for insert with check (auth.uid() = user_id);

create policy zones_update_own on public.zones
  for update using (auth.uid() = user_id);

create policy zones_delete_own on public.zones
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- harvests
-- ---------------------------------------------------------------------------
drop policy if exists harvests_select_own on public.harvests;
drop policy if exists harvests_insert_own on public.harvests;
drop policy if exists harvests_update_own on public.harvests;
drop policy if exists harvests_delete_own on public.harvests;

create policy harvests_select_own on public.harvests
  for select using (auth.uid() = user_id);

create policy harvests_insert_own on public.harvests
  for insert with check (auth.uid() = user_id);

create policy harvests_update_own on public.harvests
  for update using (auth.uid() = user_id);

create policy harvests_delete_own on public.harvests
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- irrigation_logs
-- ---------------------------------------------------------------------------
drop policy if exists irrigation_logs_select_own on public.irrigation_logs;
drop policy if exists irrigation_logs_insert_own on public.irrigation_logs;
drop policy if exists irrigation_logs_update_own on public.irrigation_logs;
drop policy if exists irrigation_logs_delete_own on public.irrigation_logs;

create policy irrigation_logs_select_own on public.irrigation_logs
  for select using (auth.uid() = user_id);

create policy irrigation_logs_insert_own on public.irrigation_logs
  for insert with check (auth.uid() = user_id);

create policy irrigation_logs_update_own on public.irrigation_logs
  for update using (auth.uid() = user_id);

create policy irrigation_logs_delete_own on public.irrigation_logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- plantation_batches
-- ---------------------------------------------------------------------------
drop policy if exists plantation_batches_select_own on public.plantation_batches;
drop policy if exists plantation_batches_insert_own on public.plantation_batches;
drop policy if exists plantation_batches_update_own on public.plantation_batches;
drop policy if exists plantation_batches_delete_own on public.plantation_batches;

create policy plantation_batches_select_own on public.plantation_batches
  for select using (auth.uid() = user_id);

create policy plantation_batches_insert_own on public.plantation_batches
  for insert with check (auth.uid() = user_id);

create policy plantation_batches_update_own on public.plantation_batches
  for update using (auth.uid() = user_id);

create policy plantation_batches_delete_own on public.plantation_batches
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- harvest_quality_metrics — checked through parent harvest.user_id
-- ---------------------------------------------------------------------------
drop policy if exists harvest_quality_metrics_select_own on public.harvest_quality_metrics;
drop policy if exists harvest_quality_metrics_insert_own on public.harvest_quality_metrics;
drop policy if exists harvest_quality_metrics_update_own on public.harvest_quality_metrics;
drop policy if exists harvest_quality_metrics_delete_own on public.harvest_quality_metrics;

create policy harvest_quality_metrics_select_own on public.harvest_quality_metrics
  for select using (
    exists (
      select 1 from public.harvests h
      where h.id = harvest_quality_metrics.harvest_id
        and h.user_id = auth.uid()
    )
  );

create policy harvest_quality_metrics_insert_own on public.harvest_quality_metrics
  for insert with check (
    exists (
      select 1 from public.harvests h
      where h.id = harvest_quality_metrics.harvest_id
        and h.user_id = auth.uid()
    )
  );

create policy harvest_quality_metrics_update_own on public.harvest_quality_metrics
  for update using (
    exists (
      select 1 from public.harvests h
      where h.id = harvest_quality_metrics.harvest_id
        and h.user_id = auth.uid()
    )
  );

create policy harvest_quality_metrics_delete_own on public.harvest_quality_metrics
  for delete using (
    exists (
      select 1 from public.harvests h
      where h.id = harvest_quality_metrics.harvest_id
        and h.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- yield_forecasts — checked through parent zone.user_id
-- ---------------------------------------------------------------------------
drop policy if exists yield_forecasts_select_own on public.yield_forecasts;
drop policy if exists yield_forecasts_insert_own on public.yield_forecasts;
drop policy if exists yield_forecasts_update_own on public.yield_forecasts;
drop policy if exists yield_forecasts_delete_own on public.yield_forecasts;

create policy yield_forecasts_select_own on public.yield_forecasts
  for select using (
    exists (
      select 1 from public.zones z
      where z.id = yield_forecasts.zone_id
        and z.user_id = auth.uid()
    )
  );

create policy yield_forecasts_insert_own on public.yield_forecasts
  for insert with check (
    exists (
      select 1 from public.zones z
      where z.id = yield_forecasts.zone_id
        and z.user_id = auth.uid()
    )
  );

create policy yield_forecasts_update_own on public.yield_forecasts
  for update using (
    exists (
      select 1 from public.zones z
      where z.id = yield_forecasts.zone_id
        and z.user_id = auth.uid()
    )
  );

create policy yield_forecasts_delete_own on public.yield_forecasts
  for delete using (
    exists (
      select 1 from public.zones z
      where z.id = yield_forecasts.zone_id
        and z.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- crop_types — public read, service-role write
-- ---------------------------------------------------------------------------
drop policy if exists crop_types_read_all on public.crop_types;

create policy crop_types_read_all on public.crop_types
  for select using (true);

-- ---------------------------------------------------------------------------
-- i18n_strings — public read, service-role write
-- ---------------------------------------------------------------------------
drop policy if exists i18n_strings_read_all on public.i18n_strings;

create policy i18n_strings_read_all on public.i18n_strings
  for select using (true);
