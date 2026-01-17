'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAuthUser } from '@/lib/useAuthUser'

type Profile = {
  id: string
  full_name: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { user, loading: authLoading } = useAuthUser()

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return

      setEmail(user.email || '')

      const { data: profileData, error: profileError } =
        await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
      } else if (profileData) {
        setProfile(profileData)
      } else {
        const newProfile = {
          id: user.id,
          full_name: user.email || '',
        }
        await supabase.from('profiles').insert(newProfile)
        setProfile(newProfile)
      }

      setLoading(false)
    }

    if (!authLoading && !user) {
      router.replace('/login')
      return
    }

    if (!authLoading) {
      loadProfile()
    }
  }, [authLoading, router, user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setMessage('')
    setError('')

    const { error: saveError } = await supabase
      .from('profiles')
      .upsert({
        id: profile.id,
        full_name: profile.full_name || '',
      })

    if (saveError) {
      setError(saveError.message)
    } else {
      setMessage('Profile updated.')
    }

    setSaving(false)
  }

  if (loading || authLoading) return <p>Loading profile...</p>

  return (
    <div className="max-w-xl bg-white p-6 rounded shadow space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-gray-600">
          Update your account details.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <label className="block text-sm">
          <span className="text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            disabled
            className="mt-1 w-full rounded border p-2 bg-gray-100 text-gray-600"
          />
        </label>

        <label className="block text-sm">
          <span className="text-gray-700">Full name</span>
          <input
            type="text"
            value={profile?.full_name || ''}
            onChange={(e) =>
              setProfile((prev) =>
                prev ? { ...prev, full_name: e.target.value } : prev
              )
            }
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}
        {message ? (
          <p className="text-sm text-green-700">{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
