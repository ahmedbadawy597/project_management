import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function ChangePasswordPage() {
  const { t } = useTranslation()
  const { user, loading, changePassword } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted">
        {t('common.loading')}
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.mustChangePassword) {
    return <Navigate to="/projects" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error(t('auth.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success(t('auth.passwordChanged'))
      navigate('/projects', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('auth.passwordChangeFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#E8E4D8] px-3 py-6 sm:p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-[#F3F0E6] p-5 shadow-[0_20px_50px_rgba(31,46,38,0.1)] sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-navy">{t('auth.changePasswordTitle')}</h1>
          <p className="mt-2 text-sm text-muted">{t('auth.changePasswordBody')}</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="currentPassword">
              {t('auth.currentPassword')}
            </label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-11"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="newPassword">
              {t('auth.newPassword')}
            </label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="confirmPassword">
              {t('auth.confirmPassword')}
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11"
              disabled={submitting}
            />
          </div>
          <Button className="h-11 w-full" type="submit" disabled={submitting}>
            {submitting ? t('auth.updatingPassword') : t('auth.updatePassword')}
          </Button>
        </form>
      </div>
    </div>
  )
}
