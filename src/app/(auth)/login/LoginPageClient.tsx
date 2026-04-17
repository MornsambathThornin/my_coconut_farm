'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ErrorModal from '@/components/ui/ErrorModal'
import Toast from '@/components/ui/Toast'

export default function LoginPageClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '' })
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: '',
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/dashboard')
      }
    }

    checkSession()
  }, [router])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setConfirmOpen(true)
  }

  const handleConfirmLogin = async () => {
    setConfirmOpen(false)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorModal({ open: true, message: error.message })
    } else {
      setToast({ open: true, message: 'Signed in successfully.' })
      setTimeout(() => {
        router.replace('/dashboard')
      }, 600)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-lg shadow w-96"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">
          🌴 Farm Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 rounded mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
        <ConfirmModal
          open={confirmOpen}
          title="Sign in?"
          message="Confirm you want to sign in with these credentials."
          confirmLabel="Sign in"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirmLogin}
        />
        <ErrorModal
          open={errorModal.open}
          title="Sign in failed"
          message={errorModal.message}
          onClose={() =>
            setErrorModal((prev) => ({ ...prev, open: false }))
          }
        />
        <Toast
          open={toast.open}
          message={toast.message}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        />
      </form>
    </div>
  )
}
