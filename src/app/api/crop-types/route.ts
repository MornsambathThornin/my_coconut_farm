import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'

export async function GET() {
  const { sb, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data, error } = await sb
    .from('crop_types')
    .select('id, name_en, name_km, category, default_unit')
    .order('name_en')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
