import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/api/supabaseServer'

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

  const sb = await createServerSupabase()
  const { data: userData, error: authError } = await sb.auth.getUser()
  if (authError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await sb
      .from('plantation_batches')
      .insert({
        user_id: userData.user.id,
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
