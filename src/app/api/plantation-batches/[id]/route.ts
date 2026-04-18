import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
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
  const update: Record<string, unknown> = {}

  if (payload.planting_year != null) {
    const year = Number(payload.planting_year)
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: 'planting_year must be a number' }, { status: 400 })
    }
    update.planting_year = year
  }
  if (payload.tree_count != null) {
    const count = Number(payload.tree_count)
    if (!Number.isFinite(count) || count < 0) {
      return NextResponse.json({ error: 'tree_count must be zero or greater' }, { status: 400 })
    }
    update.tree_count = count
  }
  if (payload.variety != null) {
    update.variety = typeof payload.variety === 'string' ? payload.variety : null
  }
  if (payload.notes != null) {
    update.notes = typeof payload.notes === 'string' ? payload.notes : null
  }

  try {
    const { data, error } = await sb
      .from('plantation_batches')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to update plantation batch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { id } = await params

  try {
    const { data, error } = await sb
      .from('plantation_batches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to delete plantation batch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
