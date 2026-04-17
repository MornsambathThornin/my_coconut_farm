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
  - Dashboard home page translated: header, welcome message (with `{name}` interpolation), multi-farm selector label, Establish Your Farm empty state, metric cards (Total Area / Active Zones / Total Harvest / Tree Count), Average Productivity section, Farm Details sidebar, Farm Map heading and no-boundary fallback, farm-created toast, and Something Went Wrong error dialog (new `dashboard.*` keys).
  - Zones list page translated: title, farm-scoped subtitle (with `{farm}` interpolation), add-zone button, empty state, no-farm-detected empty state with CTA, error dialog title (new `zones.*` keys).
  - Farms list page and `FarmListClient` fully translated: title, Create Farm button, Dashboard link, create dialog, loading/empty states, per-row action buttons (Edit / View Zones / Delete), delete confirmation (with `{name}` interpolation), post-delete toast + Undo action, and error fallbacks (new `farms.*` keys).
  - Profile page fully translated: header, Account Details form (email, full name, placeholder, save/saving button states, validation errors), Farm Overview card (farm name, location, total area, notes, edit farm CTA, no-farm prompt + save toast), Account Summary (member since / last sign in), Activity Snapshot metrics, save confirmation dialog, error dialog (new `profile.*` keys).
  - **LocaleProvider promoted to the root layout** so the locale context covers both `(auth)/login` and `dashboard` subtrees (dashboard layout no longer mounts its own provider). Also updates the root `metadata` from "Create Next App" to "Farm Management Dashboard".
  - **Login page** translated: title, email/password placeholders, submit + submitting labels, confirmation dialog, error dialog, success toast. Adds a `light` variant to `LocaleSwitcher` and drops it into the login card so the language can be changed before signing in (new `login.*` keys).
  - **Zone create page** translated: title, subtitle, back link, all form labels and placeholders (name, area, tree count, avg tree age, variety, crop type), crop-type dropdown options, default-unit hint with `{unit}` interpolation, boundary-points hint with `{count}` interpolation, submit + submitting states, confirmation dialog, no-farm empty state, error messages, success toast (new `zoneCreate.*` keys).
  - **Zone detail page** fully translated: loading/error states, back link, Zone Active / Edit Zone / Delete Zone action pills, Mixed variety fallback, Total Production footer, Production Trend and Seasonal Forecast section headings and empty states (with `{month}`/`{yield}`/`{confidence}` interpolation in the latest-forecast sentence), Zone Map heading and no-boundary fallback, Harvest tab (New Harvest heading, Add Harvest button, Harvest History table headers, dialog title), Irrigation tab (Log Irrigation heading, Add Irrigation button, Irrigation Logs table headers, dialog title), Batches tab (planting-batch form placeholders, submit/submitting states, confirmation, error, table headers), Edit Zone dialog (labels reuse `zoneCreate.*`), Delete Zone confirmation + error dialogs + success toast (new `zoneDetail.*` keys).
  - **Farm edit page** (`FarmEditClient`) translated: title, subtitle, back link, form labels (name, location, total area with placeholder), save/saving button states, confirmation dialog, error dialog, success toast, and the no-farm fallback (new `farmEdit.*` keys; the server-rendered farm-not-found page remains English for now since it has no locale context).
  - **Farm, Harvest, and Irrigation forms** translated: labels, placeholders, validation error messages, submit/submitting states, confirmation dialog titles + messages, error and success toasts. `FarmCreateForm` picks up new `farmForm.*` keys, `HarvestForm` picks up `harvestForm.*`, and `IrrigationForm` picks up `irrigationForm.*` (all paired with Khmer translations).
  - **Farm edit not-found state is now translatable.** The server page at `src/app/dashboard/farm/[id]/edit/page.tsx` no longer renders its own English fallback; it always hands off to `FarmEditClient`, which renders the localized `farmEdit.notFoundTitle` / `farmEdit.notFoundDesc` / `farmEdit.back` card when `initialFarm` is `null`.
- **Dynamic crop-category icons** (`src/lib/cropIcon.ts`). A new `getCropIcon(category)` helper maps `crop_types.category` to a Lucide icon, emoji, and accent color so the UI reflects the crop:
  - `tree` → palm tree (coconut, etc.)
  - `fruit` → apple / 🍌
  - `root` → carrot / 🥔
  - `cereal` → wheat / 🌾
  - `other` → leaf / 🌱
  - fallback → sprout / 🌱
  - `ZoneCard` now shows a category emoji badge and uses the dynamic emoji for the "Plants" line (no more hardcoded 🌴 assumption, no more "Trees:" label for non-tree crops).
  - Zone detail hero's variety row now renders the category icon with its accent color instead of the hardcoded `Sprout` icon, giving coconut zones a palm-tree glyph, rice zones a wheat glyph, cassava zones a carrot glyph, etc.
  - `GET /api/zones` now joins `crop_type:crop_types(id, name_en, name_km, category, default_unit)` so the list page has the category without a second round-trip.
