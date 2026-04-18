# Database migrations

This directory tracks the canonical schema and security model for the farm
management dashboard. Files are applied in lexicographic order.

| File | Purpose |
|------|---------|
| `0001_init_schema.sql` | Every table, column, foreign key, and index the app needs. Fully idempotent — safe against an existing database. |
| `0002_rls_policies.sql` | Enables row-level security on every user-owned table and installs owner-scoped SELECT/INSERT/UPDATE/DELETE policies. |

## How to apply

### Supabase Dashboard (quickest for a single environment)

1. Open the project in the Supabase dashboard.
2. Go to **SQL editor** → **New query**.
3. Paste the contents of `0001_init_schema.sql`, run.
4. Repeat with `0002_rls_policies.sql`.

Both files are re-runnable; you can apply them again if schema drifts.

### Supabase CLI (recommended once the project is managed)

```bash
# First time only
supabase link --project-ref <your-project-ref>

# Apply pending migrations
supabase db push
```

## After applying — smoke test RLS

With the policies live, verify isolation with two accounts:

1. Sign in as **user A**, create a farm + zone.
2. Sign out, sign in as **user B**.
3. User B should see an empty farms list, not user A's farm.
4. If user B can see user A's data, RLS isn't on — re-check `0002_rls_policies.sql`
   ran and `user_id` is populated on every row.

Also check that harvest **quality metrics** and **yield forecasts** inherit
their parent's ownership:

- Insert a forecast as user A (via SQL or a future API route).
- User B calling `GET /api/zones/:id` should not receive that forecast.

## Legacy files

- `src/lib/rls-policies.sql` — the original commented-out policy draft. Kept
  for reference; **the canonical policies now live in
  `0002_rls_policies.sql`.**
- `src/lib/seed-crop-types.sql` — seed for the 8 Cambodia crops. Run once
  after the schema is in place (or fold into a `0003_seed_crop_types.sql`
  migration).
