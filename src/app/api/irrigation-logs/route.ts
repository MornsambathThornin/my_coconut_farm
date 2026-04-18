import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const farmId = req.nextUrl.searchParams.get('farm_id')
  if (!farmId) {
    return NextResponse.json({ error: 'farm_id is required' }, { status: 400 })
  }

  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data, error } = await sb
    .from('irrigation_logs')
    .select('id, irrigation_date, method, duration_minutes, water_source, notes, zone_id, zones(name)')
    .eq('user_id', user.id)
    .eq('zones.farm_id', farmId)
    .order('irrigation_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const farmId = req.nextUrl.searchParams.get('farm_id')
  if (!farmId) {
    return NextResponse.json({ error: 'farm_id is required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const zoneId = typeof payload.zone_id === 'string' ? payload.zone_id : ''
  const irrigationDate = typeof payload.irrigation_date === 'string' ? payload.irrigation_date : ''

  if (!zoneId) {
    return NextResponse.json({ error: 'Zone is required' }, { status: 400 })
  }
  if (!irrigationDate) {
    return NextResponse.json({ error: 'Irrigation date is required' }, { status: 400 })
  }

  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data: zoneRecord } = await sb
    .from('zones')
    .select('farm_id, user_id')
    .eq('id', zoneId)
    .maybeSingle()

  if (!zoneRecord || zoneRecord.user_id !== user.id || zoneRecord.farm_id !== farmId) {
    return NextResponse.json({ error: 'Zone is not available for this farm' }, { status: 404 })
  }

  try {
    const { data, error } = await sb
      .from('irrigation_logs')
      .insert({
        user_id: user.id,
        zone_id: zoneId,
        irrigation_date: irrigationDate,
        method: typeof payload.method === 'string' ? payload.method : null,
        duration_minutes: payload.duration_minutes != null ? Number(payload.duration_minutes) : null,
        water_source: typeof payload.water_source === 'string' ? payload.water_source : null,
        notes: typeof payload.notes === 'string' ? payload.notes : null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to create irrigation log'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
