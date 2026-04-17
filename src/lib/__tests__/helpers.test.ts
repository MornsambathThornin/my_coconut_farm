import { vi } from 'vitest'

vi.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

import {
  calculateYieldPerHectare,
  filterHarvestsByDateRange,
  groupHarvestByMonth,
  groupHarvestByZone,
  sumHarvestQuantity,
} from '@/lib/helpers'

describe('helpers', () => {
  it('groups harvests by month', () => {
    const result = groupHarvestByMonth([
      { harvest_date: '2025-01-10', quantity: 10 },
      { harvest_date: '2025-01-20', quantity: 15 },
      { harvest_date: '2025-02-05', quantity: 5 },
    ])
    expect(result).toEqual([
      { month: '2025-01', quantity: 25 },
      { month: '2025-02', quantity: 5 },
    ])
  })

  it('groups harvests by zone', () => {
    const result = groupHarvestByZone([
      { harvest_date: '2025-01-10', quantity: 10, zones: [{ name: 'A' }] },
      { harvest_date: '2025-01-20', quantity: 15, zones: [{ name: 'B' }] },
      { harvest_date: '2025-02-05', quantity: 5, zones: [{ name: 'A' }] },
    ])
    expect(result).toEqual([
      { zone: 'A', quantity: 15 },
      { zone: 'B', quantity: 15 },
    ])
  })

  it('sums harvest quantity', () => {
    const total = sumHarvestQuantity([
      { harvest_date: '2025-01-01', quantity: 5 },
      { harvest_date: '2025-01-02', quantity: 7 },
    ])
    expect(total).toBe(12)
  })

  it('calculates yield per hectare', () => {
    expect(calculateYieldPerHectare(100, 10)).toBe(10)
    expect(calculateYieldPerHectare(100, 0)).toBe(0)
  })

  it('filters by date range', () => {
    const data = [
      { harvest_date: '2025-01-10', quantity: 10 },
      { harvest_date: '2025-02-10', quantity: 15 },
      { harvest_date: '2025-03-10', quantity: 5 },
    ]
    const result = filterHarvestsByDateRange(data, '2025-02-01', '2025-02-28')
    expect(result).toEqual([{ harvest_date: '2025-02-10', quantity: 15 }])
  })
})
