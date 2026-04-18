import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createFarmServer } from '@/lib/api/supabaseServer'
import { requireUser } from '@/lib/api/auth'

export async function GET() {
  const { sb, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data, error } = await sb
    .from('farms')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

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
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Farm name is required' }, { status: 400 })
  }
  if (name.length > 100) {
    return NextResponse.json({ error: 'Farm name is too long' }, { status: 400 })
  }

  if (payload.location && typeof payload.location === 'string' && payload.location.length > 120) {
    return NextResponse.json({ error: 'Location is too long' }, { status: 400 })
  }

  if (payload.total_area_ha != null) {
    const area = Number(payload.total_area_ha)
    if (Number.isNaN(area) || area < 0) {
      return NextResponse.json({ error: 'Total area must be a positive number' }, { status: 400 })
    }
  }

  try {
    const created = await createFarmServer(
      {
        ...(payload as Record<string, unknown>),
        name,
        location: typeof payload.location === 'string' ? payload.location : null,
        total_area_ha: payload.total_area_ha != null ? Number(payload.total_area_ha) : null,
      },
      user.id
    )

    return NextResponse.json(created)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to create farm'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
