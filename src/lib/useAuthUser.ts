'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function useAuthUser() {
  const [user, setUser] = useState<{
    id: string
    email?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const isInvalidRefreshToken = (message: string) =>
      message.toLowerCase().includes('refresh token')

    const loadUser = async () => {
      const { data, error: userError } =
        await supabase.auth.getUser()

      if (!isMounted) return

      if (userError) {
        if (isInvalidRefreshToken(userError.message)) {
          await supabase.auth.signOut()
          setUser(null)
          setError('Session expired. Please sign in again.')
          setLoading(false)
          return
        }
        setError(userError.message)
      }

      setUser(data.user ?? null)
      setLoading(false)
    }

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
        if (isMounted) {
          setUser(session?.user ?? null)
        }
      })

    loadUser()

    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error }
}
