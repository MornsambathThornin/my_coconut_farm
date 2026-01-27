# Coconut Farm Dashboard

A Next.js + Supabase dashboard for managing farms, zones, harvests, irrigation logs, and plantation batches with analytics, maps, and reporting.

## Features

- Farm profile create + edit with boundary drawing on a map
- Dashboard overview metrics and farm map with all zone boundaries + hover details
- Zone creation + edit with map drawing, auto area (ha), and boundary validation
- Zone boundaries constrained to farm boundary; overlap with existing zones blocked
- Zone detail with production analytics, harvest history, irrigation logs, and batches
- Confirm dialogs, toasts, and error handling throughout
- Supabase auth + row-level security (RLS) ready

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Supabase (Auth + Postgres)
- Recharts for charts
- Google Maps JS API (Drawing + Geometry libraries)

## Getting Started

Install dependencies:

```bash
npm install
```

Set environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Run the dev server:

```bash
npm run dev
```

Open http://localhost:3000

## Key Routes

- `/dashboard` — Farm overview + metrics + farm map
- `/dashboard/farm/edit` — Edit farm details + farm boundary
- `/dashboard/zones` — Zones list
- `/dashboard/zones/create` — Create zone with map drawing
- `/dashboard/zones/[id]` — Zone detail, edit, delete

## Data Model Notes

- Zones store polygon boundaries in `zones.boundary` (jsonb) as `[lng, lat]` pairs.
- Farms store the main boundary in `farms.boundary` (jsonb).
- Zone area is calculated from the drawn polygon and stored in `zones.area_ha`.

If you don’t have `farms.boundary` yet:

```sql
alter table public.farms
add column if not exists boundary jsonb;
```

## Scripts

```bash
npm run dev     # start dev server
npm run build   # build for production
npm run start   # start production server
npm run lint    # lint
```

## Supabase Notes

- Client and server helpers live in `src/utils/supabase`.
- Example RLS policies are in `src/lib/rls-policies.sql` (uncomment and apply in Supabase).

## Project Structure

- `src/app` — Next.js routes (dashboard, auth)
- `src/components` — UI + forms
- `src/components/maps` — map components
- `src/lib` — helpers, policies
- `src/utils/supabase` — Supabase client/server helpers

## Deployment

Deploy with Vercel or any Node hosting. Ensure the Supabase env vars are set in your deployment environment.
