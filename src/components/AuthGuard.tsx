'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthUser } from '@/lib/useAuthUser'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuthUser()

  useEffect(() => {
    if (!loading && !user) {
      // preserve return path so user is redirected back after login
      const next = pathname || '/dashboard'
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [loading, user, router, pathname])

  if (loading) return <div className="p-6">Loading...</div>

  return <>{children}</>
}
