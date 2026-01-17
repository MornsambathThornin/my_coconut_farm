'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/lib/useAuthUser'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuthUser()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading) return <div className="p-6">Loading...</div>

  return <>{children}</>
}
