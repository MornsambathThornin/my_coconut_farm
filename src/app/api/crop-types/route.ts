import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/api/supabaseServer'

export async function GET() {
  const sb = await createServerSupabase()
  const { data: userData, error: authError } = await sb.auth.getUser()
  if (authError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await sb
    .from('crop_types')
    .select('id, name_en, name_km, category, default_unit')
    .order('name_en')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
