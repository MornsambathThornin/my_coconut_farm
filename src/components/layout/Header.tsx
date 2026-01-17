'use client'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Header() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const logout = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    if (!error) {
      router.replace('/login')
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="text-sm text-red-500 hover:underline"
    >
      {loading ? 'Signing out...' : 'Logout'}
    </button>
  )
}
