import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const farmId = req.nextUrl.searchParams.get('farm_id')
  let query = sb
    .from('zones')
    .select('*, crop_type:crop_types(id, name_en, name_km, category, default_unit)')
    .eq('user_id', user.id)
    .order('name')
  if (farmId) {
    query = query.eq('farm_id', farmId)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
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
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const farmId = typeof payload.farm_id === 'string' ? payload.farm_id : ''

  if (!name) {
    return NextResponse.json({ error: 'Zone name is required' }, { status: 400 })
  }
  if (!farmId) {
    return NextResponse.json({ error: 'Farm id is required' }, { status: 400 })
  }

  const boundary = Array.isArray(payload.boundary) ? payload.boundary : []
  if (!Array.isArray(boundary) || boundary.length < 3) {
    return NextResponse.json({ error: 'Zone boundary is required' }, { status: 400 })
  }

  const { data: farm } = await sb
    .from('farms')
    .select('user_id')
    .eq('id', farmId)
    .maybeSingle()

  if (!farm || farm.user_id !== user.id) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
  }

  try {
    const { data, error } = await sb
      .from('zones')
      .insert({
        user_id: user.id,
        farm_id: farmId,
        name,
        area_ha: payload.area_ha != null ? Number(payload.area_ha) : null,
        tree_count: payload.tree_count != null ? Number(payload.tree_count) : null,
        avg_tree_age_years: payload.avg_tree_age_years != null ? Number(payload.avg_tree_age_years) : null,
        variety: typeof payload.variety === 'string' ? payload.variety : null,
        crop_type_id: typeof payload.crop_type_id === 'string' && payload.crop_type_id ? payload.crop_type_id : null,
        boundary,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to create zone'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
