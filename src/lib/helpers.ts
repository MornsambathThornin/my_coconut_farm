import { format } from 'date-fns'
import { supabase } from '@/utils/supabase/client'

export interface Harvest {
  harvest_date: string | Date
  quantity: string | number
  zone_id?: string | null
  unit?: string | null
  quality_grade?: string | null
  notes?: string | null
  zones?: {
    name: string | null
    tree_count?: number | null
  }[] | null
}

export function groupHarvestByMonth(harvests: Harvest[]) {
  const map: Record<string, number> = {}

  harvests.forEach((h) => {
    const month = format(new Date(h.harvest_date), 'yyyy-MM')
    map[month] = (map[month] || 0) + Number(h.quantity)
  })

  return Object.entries(map).map(([month, quantity]) => ({
    month,
    quantity,
  }))
}

export function groupHarvestByZone(harvests: Harvest[]) {
  const map: Record<string, number> = {}

  harvests.forEach((h) => {
    const zone = h.zones?.[0]?.name || 'Unknown'
    map[zone] = (map[zone] || 0) + Number(h.quantity)
  })

  return Object.entries(map).map(([zone, quantity]) => ({
    zone,
    quantity,
  }))
}

export function sumHarvestQuantity(harvests: Harvest[]) {
  return harvests.reduce(
    (total, h) => total + Number(h.quantity || 0),
    0
  )
}

export function calculateYieldPerTree(
  totalQuantity: number,
  treeCount?: number | null
) {
  if (!treeCount || treeCount <= 0) return 0
  return totalQuantity / treeCount
}

export function filterHarvestsByDateRange(
  harvests: Harvest[],
  startDate?: string,
  endDate?: string
) {
  let start: Date | null = null
  let end: Date | null = null

  if (!startDate && !endDate) {
    const now = new Date()
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  } else {
    start = startDate ? new Date(startDate) : null
    end = endDate ? new Date(endDate) : null
    if (end) {
      end = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate(),
        23,
        59,
        59,
        999
      )
    }
  }

  return harvests.filter((h) => {
    const date = new Date(h.harvest_date)
    if (Number.isNaN(date.getTime())) return false
    if (start && date < start) return false
    if (end && date > end) return false
    return true
  })
}

export async function ensureProfileAndFarm(
  userId?: string,
  email?: string | null
) {
  let resolvedUserId = userId
  let resolvedEmail = email

  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null
    resolvedUserId = user.id
    resolvedEmail = user.email
  }

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', resolvedUserId)
    .single()

  if (!profile) {
    await supabase.from('profiles').insert({
      id: resolvedUserId,
      full_name: resolvedEmail
    })
  }

  // Farm
  const { data: farms } = await supabase
    .from('farms')
    .select('*')
    .eq('user_id', resolvedUserId)
    .limit(1)

  if (!farms || farms.length === 0) return null

  return farms[0]
}
