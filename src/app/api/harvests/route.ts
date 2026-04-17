import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/api/supabaseServer'

type MetricPayload = {
  metric_name: string
  metric_value: number
  unit?: string | null
}

export async function GET(req: NextRequest) {
  const farmId = req.nextUrl.searchParams.get('farm_id')
  if (!farmId) {
    return NextResponse.json({ error: 'farm_id is required' }, { status: 400 })
  }

  const sb = await createServerSupabase()
  const { data: userData, error: authError } = await sb.auth.getUser()
  if (authError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await sb
    .from('harvests')
    .select('id, harvest_date, quantity, unit, quality_grade, notes, zone_id, zones(name)')
    .eq('user_id', userData.user.id)
    .eq('zones.farm_id', farmId)
    .order('harvest_date', { ascending: false })

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
  const harvestDate = typeof payload.harvest_date === 'string' ? payload.harvest_date : ''
  const quantity = payload.quantity != null ? Number(payload.quantity) : NaN
  const unit = typeof payload.unit === 'string' ? payload.unit : null
  const qualityGrade = typeof payload.quality_grade === 'string' ? payload.quality_grade : null
  const notes = typeof payload.notes === 'string' ? payload.notes : null
  const metrics = Array.isArray(payload.metrics) ? (payload.metrics as MetricPayload[]) : []

  if (!zoneId) {
    return NextResponse.json({ error: 'Zone is required' }, { status: 400 })
  }
  if (!harvestDate) {
    return NextResponse.json({ error: 'Harvest date is required' }, { status: 400 })
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 })
  }

  const sb = await createServerSupabase()
  const { data: userData, error: authError } = await sb.auth.getUser()
  if (authError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: zoneRecord } = await sb
    .from('zones')
    .select('farm_id, user_id')
    .eq('id', zoneId)
    .maybeSingle()

  if (!zoneRecord || zoneRecord.user_id !== userData.user.id || zoneRecord.farm_id !== farmId) {
    return NextResponse.json({ error: 'Zone is not available for this farm' }, { status: 404 })
  }

  try {
    const { data: harvest, error: insertError } = await sb
      .from('harvests')
      .insert({
        user_id: userData.user.id,
        zone_id: zoneId,
        harvest_date: harvestDate,
        quantity,
        unit,
        quality_grade: qualityGrade,
        notes,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (metrics.length > 0) {
      const sanitized = metrics
        .filter((m) => m && m.metric_name && Number.isFinite(m.metric_value))
        .map((m) => ({
          harvest_id: harvest.id,
          metric_name: m.metric_name,
          metric_value: Number(m.metric_value),
          unit: m.unit ?? null,
        }))

      if (sanitized.length > 0) {
        const { error: metricError } = await sb
          .from('harvest_quality_metrics')
          .insert(sanitized)

        if (metricError) {
          return NextResponse.json({ error: metricError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json(harvest)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to create harvest'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
