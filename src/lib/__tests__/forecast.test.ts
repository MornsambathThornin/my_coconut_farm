import { describe, it, expect } from 'vitest'
import { generateForecast } from '@/lib/forecast'

const now = new Date(Date.UTC(2026, 3, 17)) // 2026-04-17

describe('generateForecast', () => {
  it('returns empty array when area is missing or zero', () => {
    expect(generateForecast([], 0, { now })).toEqual([])
    expect(generateForecast([], null, { now })).toEqual([])
    expect(generateForecast([], undefined, { now })).toEqual([])
  })

  it('returns a zero-valued horizon when there is no harvest history', () => {
    const out = generateForecast([], 2, { now, horizonMonths: 3 })
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({
      forecast_month: '2026-05-01',
      expected_yield_kg_per_ha: 0,
      confidence_score: 0,
      model_version: 'sma-v1',
    })
  })

  it('averages the trailing window into kg/ha and projects forward', () => {
    // 1 ha zone, three months of 100 kg harvests each
    const harvests = [
      { harvest_date: '2026-02-10', quantity: 100 },
      { harvest_date: '2026-03-10', quantity: 100 },
      { harvest_date: '2026-04-10', quantity: 100 },
    ]
    const out = generateForecast(harvests, 1, { now, horizonMonths: 2, windowMonths: 3 })
    expect(out).toHaveLength(2)
    // Every forecast month should be the trailing average (100 kg/ha)
    out.forEach((row) => {
      expect(row.expected_yield_kg_per_ha).toBe(100)
    })
    // First month should be May 2026 (next month after 2026-04)
    expect(out[0].forecast_month).toBe('2026-05-01')
    expect(out[1].forecast_month).toBe('2026-06-01')
  })

  it('divides by area to produce kg/ha, not raw kg', () => {
    const harvests = [{ harvest_date: '2026-04-10', quantity: 200 }]
    const out = generateForecast(harvests, 2, { now, horizonMonths: 1 })
    // 200 kg / 2 ha => 100 kg/ha
    expect(out[0].expected_yield_kg_per_ha).toBe(100)
  })

  it('caps confidence at 1.0 and scales with months of history', () => {
    const oneMonth = [{ harvest_date: '2026-04-10', quantity: 100 }]
    const sixteenMonths = Array.from({ length: 16 }, (_, i) => ({
      harvest_date: `2025-${String(((i % 12) + 1)).padStart(2, '0')}-10`,
      quantity: 100,
    }))

    const low = generateForecast(oneMonth, 1, { now, horizonMonths: 1 })
    const high = generateForecast(sixteenMonths, 1, { now, horizonMonths: 1 })

    // 1 month of data -> low confidence
    expect(low[0].confidence_score).toBeCloseTo(1 / 12, 2)
    // 12+ months -> capped at 1
    expect(high[0].confidence_score).toBe(1)
  })
})
