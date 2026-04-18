import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/api/supabaseServer'

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>

type RequireUserResult =
  | { sb: ServerSupabase; user: User; unauthorized: null }
  | { sb: ServerSupabase; user: null; unauthorized: NextResponse }

/**
 * Resolve the authenticated user for an API route. Returns the server-scoped
 * Supabase client plus the user on success, or a ready-to-return 401 response
 * on failure so callers stay flat:
 *
 *   const { sb, user, unauthorized } = await requireUser()
 *   if (unauthorized) return unauthorized
 *   // ...use sb and user
 */
export async function requireUser(): Promise<RequireUserResult> {
  const sb = await createServerSupabase()
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) {
    return {
      sb,
      user: null,
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { sb, user: data.user, unauthorized: null }
}
