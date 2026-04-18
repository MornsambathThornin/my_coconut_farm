import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateFarmServer, deleteFarmServer } from '@/lib/api/supabaseServer'
import { requireUser } from '@/lib/api/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { id } = await params

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

  if (payload.name != null) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Farm name is required' }, { status: 400 })
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Farm name is too long' }, { status: 400 })
    }
    payload.name = name
  }

  if (payload.location && typeof payload.location === 'string' && payload.location.length > 120) {
    return NextResponse.json({ error: 'Location is too long' }, { status: 400 })
  }

  if (payload.total_area_ha != null) {
    const area = Number(payload.total_area_ha)
    if (Number.isNaN(area) || area < 0) {
      return NextResponse.json({ error: 'Total area must be a positive number' }, { status: 400 })
    }
    payload.total_area_ha = area
  }

  const { data: existing } = await sb
    .from('farms')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
  }

  try {
    const updated = await updateFarmServer(id, payload)
    return NextResponse.json(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to update farm'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { id } = await params

  const { data: existing } = await sb
    .from('farms')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
  }

  try {
    const deleted = await deleteFarmServer(id)
    return NextResponse.json(deleted)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to delete farm'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
