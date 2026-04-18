import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/api/supabaseServer'

/**
 * GET /api/i18n-strings
 *
 * Returns the (optional) translation overrides. Unauthenticated — matches
 * the RLS policy `i18n_strings_read_all`. Rows here override the baked-in
 * fallback translations in src/lib/i18n.ts.
 */
export async function GET() {
  const sb = await createServerSupabase()
  const { data, error } = await sb
    .from('i18n_strings')
    .select('key, en, km')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
