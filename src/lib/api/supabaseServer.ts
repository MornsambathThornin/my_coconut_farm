import { cookies } from 'next/headers'
import { createClient as createServerClient } from '@/utils/supabase/server'

type Farm = {
  id?: string
  name: string
  location?: string | null
  total_area_ha?: number | null
  boundary?: unknown | null
  notes?: string | null
  user_id?: string | null
}

type SupabaseResult<T> = { data: T | null; error: { message?: string } | null }

function handleError<T>(result: SupabaseResult<T>) {
  if (result.error) {
    const err = new Error(result.error.message || 'Supabase error')
    ;(err as { original?: unknown }).original = result.error
    throw err
  }
  return result.data
}

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(cookieStore)
}

export async function getFarmsServer() {
  const sb = await createServerSupabase()
  const res = await sb.from('farms').select('*').order('created_at', { ascending: false })
  return handleError(res)
}

export async function getFarmByIdServer(id: string) {
  const sb = await createServerSupabase()
  const { data: userData, error: authError } = await sb.auth.getUser()
  if (authError || !userData.user) {
    return null
  }

  const res = await sb
    .from('farms')
    .select('*')
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  return handleError(res)
}

export async function createFarmServer(payload: Farm, userId: string) {
  const sb = await createServerSupabase()
  const res = await sb
    .from('farms')
    .insert({
      ...payload,
      user_id: userId,
    })
    .select()
    .single()
  return handleError(res)
}

export async function updateFarmServer(id: string, payload: Partial<Farm>) {
  const sb = await createServerSupabase()
  const res = await sb.from('farms').update(payload).eq('id', id).select().single()
  return handleError(res)
}

export async function deleteFarmServer(id: string) {
  const sb = await createServerSupabase()
  const res = await sb.from('farms').delete().eq('id', id).select().single()
  return handleError(res)
}
