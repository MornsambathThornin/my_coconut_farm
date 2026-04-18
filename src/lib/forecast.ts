/**
 * Server-side seasonal forecaster (SMA v1).
 *
 * Input: a list of harvest records for a single zone and the zone's area.
 * Output: a monthly yield projection for the next `horizonMonths` months in
 * kg/ha, plus a confidence score that grows with the amount of history.
 *
 * Method:
 *   1. Bucket harvests by calendar month, convert to kg/ha using zone area.
 *   2. Take the trailing window (default 3 months) of buckets that exist.
 *   3. Use that window's average as the projection for every forward month.
 *   4. Confidence = min(1, monthsOfHistory / 12).
 *
 * This is a deliberately simple moving-average model — no seasonality
 * decomposition, no trend component. Matches the "SMA v1" label the UI
 * already shows and is honest about what it is.
 */

export type HarvestRow = {
  harvest_date: string // ISO date like "2026-04-17"
  quantity: number
}

export type ForecastRow = {
  forecast_month: string // "YYYY-MM-01"
  expected_yield_kg_per_ha: number
  confidence_score: number
  model_version: string
}

type ForecastOptions = {
  windowMonths?: number
  horizonMonths?: number
  now?: Date
}

const MODEL_VERSION = 'sma-v1'

export function generateForecast(
  harvests: HarvestRow[],
  areaHa: number | null | undefined,
  options: ForecastOptions = {},
): ForecastRow[] {
  const windowMonths = options.windowMonths ?? 3
  const horizonMonths = options.horizonMonths ?? 6
  const now = options.now ?? new Date()

  if (!areaHa || areaHa <= 0) return []

  const monthly = bucketByMonth(harvests, areaHa)
  if (monthly.size === 0) {
    return buildEmptyHorizon(now, horizonMonths)
  }

  const sortedMonths = Array.from(monthly.keys()).sort()
  const recent = sortedMonths.slice(-windowMonths)
  const avg = recent.reduce((sum, m) => sum + (monthly.get(m) ?? 0), 0) / recent.length

  const confidence = Math.min(1, sortedMonths.length / 12)

  const out: ForecastRow[] = []
  const cursor = startOfNextMonth(now)
  for (let i = 0; i < horizonMonths; i++) {
    out.push({
      forecast_month: formatIsoMonth(cursor),
      expected_yield_kg_per_ha: roundTo(avg, 2),
      confidence_score: roundTo(confidence, 2),
      model_version: MODEL_VERSION,
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return out
}

function bucketByMonth(harvests: HarvestRow[], areaHa: number): Map<string, number> {
  const totals = new Map<string, number>()
  for (const h of harvests) {
    if (!h.harvest_date || !Number.isFinite(h.quantity)) continue
    const key = h.harvest_date.slice(0, 7) // YYYY-MM
    totals.set(key, (totals.get(key) ?? 0) + h.quantity)
  }
  const kgPerHa = new Map<string, number>()
  for (const [month, total] of totals) {
    kgPerHa.set(month, total / areaHa)
  }
  return kgPerHa
}

function buildEmptyHorizon(now: Date, horizonMonths: number): ForecastRow[] {
  const cursor = startOfNextMonth(now)
  const out: ForecastRow[] = []
  for (let i = 0; i < horizonMonths; i++) {
    out.push({
      forecast_month: formatIsoMonth(cursor),
      expected_yield_kg_per_ha: 0,
      confidence_score: 0,
      model_version: MODEL_VERSION,
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return out
}

function startOfNextMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

function formatIsoMonth(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}
