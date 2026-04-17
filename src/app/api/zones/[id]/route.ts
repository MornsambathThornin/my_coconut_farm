import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/api/supabaseServer'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return NextResponse.json({ error: 'Zone name is required' }, { status: 400 })
    }
    payload.name = name
  }

  if (payload.boundary != null && (!Array.isArray(payload.boundary) || payload.boundary.length < 3)) {
    return NextResponse.json({ error: 'Zone boundary is required' }, { status: 400 })
  }

  const sb = await createServerSupabase()
  const { data: userData, error: authError } = await sb.auth.getUser()
  if (authError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await sb
      .from('zones')
      .update({
        ...payload,
        area_ha: payload.area_ha != null ? Number(payload.area_ha) : null,
        tree_count: payload.tree_count != null ? Number(payload.tree_count) : null,
        avg_tree_age_years: payload.avg_tree_age_years != null ? Number(payload.avg_tree_age_years) : null,
      })
      .eq('id', id)
      .eq('user_id', userData.user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to update zone'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createServerSupabase()
  const { data: userData, error: authError } = await sb.auth.getUser()
  if (authError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await sb
      .from('zones')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to delete zone'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
