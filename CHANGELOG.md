# Changelog

A running log of notable changes to the farm dashboard, focused on the migration from a coconut-only dashboard to a multi-crop farm management system for crops popular in Cambodia (rice, cassava, mango, banana, coconut, pineapple, papaya, sugarcane, etc.).

## [Unreleased]

### Changed
- **HarvestForm is now crop-agnostic** (`src/components/forms/HarvestForm.tsx`). The `unit` field no longer defaults to `'nuts'`. It auto-fills from the selected zone's `crop_type.default_unit` (e.g. `kg` for mango, `bunches` for banana, `nuts` for coconut) and the placeholder is generated dynamically. User-entered custom units are preserved when switching zones.
  - Zone query now joins `crop_type:crop_types(default_unit, name_en)` to fetch the default unit alongside the zone.
  - When the form is opened with a `zoneId` prop, the unit is prefilled from that zone's crop type.
  - Post-save reset uses the zone's default unit instead of the hardcoded `'nuts'`.
- **Generalize coconut-specific copy** so the UI reads as a generic farm management system:
  - Reports CSV export filename changed from `coconut-report-YYYY-MM-DD.csv` to `farm-report-YYYY-MM-DD.csv` (`src/app/dashboard/reports/page.tsx`).
  - Farm-name input placeholder changed from `"e.g. North Coconut Grove"` to `"e.g. North Field"` (`src/components/FarmCreateForm.tsx`).
  - RLS policies SQL header comment updated from "Coconut Farm Dashboard" to "Farm Management Dashboard" (`src/lib/rls-policies.sql`).
