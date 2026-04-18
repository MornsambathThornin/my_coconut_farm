import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/api/auth'

/**
 * GET /api/profile
 * Returns the caller's profile. If no row exists yet (first sign-in after
 * a fresh tenant), lazily creates it using the auth user's email as the
 * initial full_name.
 */
export async function GET() {
  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data: existing, error: selectError } = await sb
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json(existing)
  }

  const { data: created, error: insertError } = await sb
    .from('profiles')
    .insert({ id: user.id, full_name: user.email ?? '' })
    .select('id, full_name, created_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(created)
}

export async function PATCH(req: NextRequest) {
  const { sb, user, unauthorized } = await requireUser()
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
  const update: Record<string, unknown> = {}

  if (payload.full_name != null) {
    const name = typeof payload.full_name === 'string' ? payload.full_name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Full name is too long' }, { status: 400 })
    }
    update.full_name = name
  }

  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: user.id, ...update }, { onConflict: 'id' })
    .select('id, full_name, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
