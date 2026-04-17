'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ErrorModal from '@/components/ui/ErrorModal'
import Toast from '@/components/ui/Toast'
import LocaleSwitcher from '@/components/layout/LocaleSwitcher'
import { useTranslations } from '@/lib/useTranslations'

export default function LoginPageClient() {
  const router = useRouter()
  const { t } = useTranslations()
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
      setToast({ open: true, message: t('login.signedInToast') })
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
        className="bg-white p-6 rounded-lg shadow w-96 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-center flex-1">
            🌴 {t('login.title')}
          </h1>
          <LocaleSwitcher variant="light" />
        </div>

        <input
          type="email"
          placeholder={t('login.emailPlaceholder')}
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder={t('login.passwordPlaceholder')}
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          {loading ? t('login.submitting') : t('login.submit')}
        </button>
        <ConfirmModal
          open={confirmOpen}
          title={t('login.confirmTitle')}
          message={t('login.confirmMessage')}
          confirmLabel={t('login.confirmLabel')}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirmLogin}
        />
        <ErrorModal
          open={errorModal.open}
          title={t('login.errorTitle')}
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
