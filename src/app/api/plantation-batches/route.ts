import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
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

  if (!zoneId) {
    return NextResponse.json({ error: 'Zone is required' }, { status: 400 })
  }

  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data: zoneRecord } = await sb
    .from('zones')
    .select('user_id')
    .eq('id', zoneId)
    .maybeSingle()

  if (!zoneRecord || zoneRecord.user_id !== user.id) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
  }

  try {
    const { data, error } = await sb
      .from('plantation_batches')
      .insert({
        user_id: user.id,
        zone_id: zoneId,
        planting_year: payload.planting_year != null ? Number(payload.planting_year) : null,
        variety: typeof payload.variety === 'string' ? payload.variety : null,
        tree_count: payload.tree_count != null ? Number(payload.tree_count) : null,
        notes: typeof payload.notes === 'string' ? payload.notes : null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to create plantation batch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
