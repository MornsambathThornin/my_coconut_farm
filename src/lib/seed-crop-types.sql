-- Seed crop_types lookup values for UAT
-- Run in Supabase SQL editor.

INSERT INTO crop_types (name_en, name_km, category, default_unit)
SELECT 'Coconut', 'ដូង', 'tree', 'nuts'
WHERE NOT EXISTS (SELECT 1 FROM crop_types WHERE name_en = 'Coconut');

INSERT INTO crop_types (name_en, name_km, category, default_unit)
SELECT 'Banana', 'ចេក', 'fruit', 'bunches'
WHERE NOT EXISTS (SELECT 1 FROM crop_types WHERE name_en = 'Banana');

INSERT INTO crop_types (name_en, name_km, category, default_unit)
SELECT 'Mango', 'ស្វាយ', 'fruit', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM crop_types WHERE name_en = 'Mango');

INSERT INTO crop_types (name_en, name_km, category, default_unit)
SELECT 'Pineapple', 'ម្នាស់', 'fruit', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM crop_types WHERE name_en = 'Pineapple');

INSERT INTO crop_types (name_en, name_km, category, default_unit)
SELECT 'Papaya', 'ល្ហុង', 'fruit', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM crop_types WHERE name_en = 'Papaya');

INSERT INTO crop_types (name_en, name_km, category, default_unit)
SELECT 'Cassava', 'ដំឡូងមី', 'root', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM crop_types WHERE name_en = 'Cassava');

INSERT INTO crop_types (name_en, name_km, category, default_unit)
SELECT 'Sugarcane', 'អំពៅ', 'other', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM crop_types WHERE name_en = 'Sugarcane');

INSERT INTO crop_types (name_en, name_km, category, default_unit)
SELECT 'Rice', 'ស្រូវ', 'cereal', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM crop_types WHERE name_en = 'Rice');
