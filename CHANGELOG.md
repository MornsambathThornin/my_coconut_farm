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

### Fixed
- **ESLint errors blocking CI** cleared so `npm run lint` exits clean:
  - `LocaleContext.tsx`: post-mount `localStorage` read is kept in an effect with a targeted `eslint-disable-next-line` and a rationale (SSR hydration mismatch would otherwise force the first paint to use the wrong locale).
  - `HarvestForm.tsx`: dropped the synchronous `setPrefilledZone(null)` reset; the fetch callback now writes the value asynchronously and the previous null-reset was unreachable in practice.
  - `FarmContext.tsx`: wrapped the URL-sync effect in a block-level `eslint-disable` with a rationale (syncing `activeFarmId` from the URL and the farms list is a legitimate external-source sync).
  - `ZoneDrawMap.tsx`: moved the `handlePolygonCompleteRef` assignment out of the render body and into a `useEffect`, fixing `react-hooks/refs`.
  - `src/lib/api/supabaseClient.ts`: removed an unused `Zone` import.

### Added
- **Locale switcher and wider i18n wiring** so the UI can be toggled between English and Khmer (ខ្មែរ):
  - New `LocaleContext` / `LocaleProvider` with `localStorage` persistence (`src/context/LocaleContext.tsx`).
  - New `LocaleSwitcher` component (`src/components/layout/LocaleSwitcher.tsx`) placed in the Sidebar footer.
  - `useTranslations()` now reads the active locale from `LocaleContext` by default (still accepts an explicit override for back-compat).
  - Dashboard layout wraps children in `LocaleProvider` alongside `FarmProvider`.
  - Sidebar navigation labels and logout button are now translatable (new `nav.*` keys).
  - Harvest and Irrigation pages are fully translated: titles, subtitles, action buttons, table headers, empty/loading/error states, dialog titles (new `harvest.*`, `irrigation.*`, `common.*` keys).
  - Added placeholder keys for `zones.*` and `farms.*` for follow-up wiring.
