import { supabase as browserSupabase } from '@/utils/supabase/client'

type Farm = {
  id?: string
  name: string
  location?: string | null
  total_area_ha?: number | null
  boundary?: unknown | null
  notes?: string | null
  user_id?: string | null
}

type Harvest = {
  id?: string
  zone_id: string
  harvest_date: string
  quantity: number
  unit: string
  notes?: string | null
}

type SupabaseResult<T> = { data: T | null; error: { message?: string } | null }

function handleError<T>(result: SupabaseResult<T>) {
  if (result.error) {
    const err = new Error(result.error.message || 'Supabase error')
    ;(err as { original?: unknown }).original = result.error
    throw err
  }
  return result.data
}

export async function getFarmsClient() {
  const res = await browserSupabase.from('farms').select('*').order('created_at', { ascending: false })
  return handleError(res)
}

export async function createFarmClient(payload: Farm) {
  const res = await browserSupabase.from('farms').insert(payload).select().single()
  return handleError(res)
}

export async function updateFarmClient(id: string, payload: Partial<Farm>) {
  const res = await browserSupabase.from('farms').update(payload).eq('id', id).select().single()
  return handleError(res)
}

export async function deleteFarmClient(id: string) {
  const res = await browserSupabase.from('farms').delete().eq('id', id).select().single()
  return handleError(res)
}

export async function getZonesByFarmClient(farmId: string) {
  const res = await browserSupabase.from('zones').select('*, crop_types(*)').eq('farm_id', farmId)
  return handleError(res)
}

export async function createHarvestClient(payload: Harvest) {
  const res = await browserSupabase.from('harvests').insert(payload).select().single()
  return handleError(res)
}

export async function getHarvestsByZoneClient(zoneId: string) {
  const res = await browserSupabase.from('harvests').select('*').eq('zone_id', zoneId).order('harvest_date', { ascending: false })
  return handleError(res)
}

export async function getI18nStrings() {
  const res = await fetch('/api/i18n-strings')
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? 'Failed to load translations')
  }
  return res.json()
}
