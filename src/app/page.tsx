'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const routeUser = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }

    routeUser()
  }, [router])

  return <div className="p-4">Loading...</div>
}
