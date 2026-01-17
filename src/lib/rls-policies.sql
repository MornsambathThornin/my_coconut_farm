-- Supabase RLS policies for Coconut Farm Dashboard
-- Uncomment and run in Supabase SQL editor when ready.

-- Add user ownership columns (if missing).
-- ALTER TABLE zones ADD COLUMN IF NOT EXISTS user_id uuid;
-- ALTER TABLE harvests ADD COLUMN IF NOT EXISTS user_id uuid;
-- ALTER TABLE irrigation_logs ADD COLUMN IF NOT EXISTS user_id uuid;

-- Enable RLS.
-- ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE irrigation_logs ENABLE ROW LEVEL SECURITY;

-- Zones policies.
-- CREATE POLICY "zones_select_own" ON zones
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "zones_insert_own" ON zones
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "zones_update_own" ON zones
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "zones_delete_own" ON zones
--   FOR DELETE USING (auth.uid() = user_id);

-- Farms policies.
-- CREATE POLICY "farms_select_own" ON farms
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "farms_insert_own" ON farms
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "farms_update_own" ON farms
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "farms_delete_own" ON farms
--   FOR DELETE USING (auth.uid() = user_id);

-- Harvests policies.
-- CREATE POLICY "harvests_select_own" ON harvests
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "harvests_insert_own" ON harvests
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "harvests_update_own" ON harvests
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "harvests_delete_own" ON harvests
--   FOR DELETE USING (auth.uid() = user_id);

-- Irrigation logs policies.
-- CREATE POLICY "irrigation_logs_select_own" ON irrigation_logs
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "irrigation_logs_insert_own" ON irrigation_logs
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "irrigation_logs_update_own" ON irrigation_logs
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "irrigation_logs_delete_own" ON irrigation_logs
--   FOR DELETE USING (auth.uid() = user_id);

-- Plantation batches: add user_id first, then enable RLS.
-- ALTER TABLE plantation_batches ADD COLUMN IF NOT EXISTS user_id uuid;
-- ALTER TABLE plantation_batches ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "plantation_batches_select_own" ON plantation_batches
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "plantation_batches_insert_own" ON plantation_batches
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "plantation_batches_update_own" ON plantation_batches
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "plantation_batches_delete_own" ON plantation_batches
--   FOR DELETE USING (auth.uid() = user_id);

-- Profiles policies.
-- CREATE POLICY "profiles_select_own" ON profiles
--   FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "profiles_insert_own" ON profiles
--   FOR INSERT WITH CHECK (auth.uid() = id);
-- CREATE POLICY "profiles_update_own" ON profiles
--   FOR UPDATE USING (auth.uid() = id);
