import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/projects'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    if (user.mustChangePassword) {
      return <Navigate to="/change-password" replace />
    }
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error(t('auth.credentialsRequired'))
      return
    }
    setSubmitting(true)
    try {
      const signedIn = await login(username.trim(), password)
      toast.success(t('auth.welcome'))
      if (signedIn.mustChangePassword) {
        navigate('/change-password', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('auth.loginFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const isAr = i18n.language === 'ar'

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#E8E4D8] px-3 py-6 sm:p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 10% 20%, rgba(15,118,110,0.18), transparent 55%), radial-gradient(ellipse 60% 45% at 90% 80%, rgba(31,107,71,0.14), transparent 50%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(31,46,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(31,46,38,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#D9D3BF] bg-[#F3F0E6]/95 shadow-[0_24px_60px_rgba(31,46,38,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-[#17523A] via-[#1F6B47] to-[#0F766E] p-10 text-white lg:flex">
          <div>
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
              أ
            </div>
            <p className="text-xs font-semibold tracking-[0.12em] text-white/70">
              {isAr ? 'المنصة الرسمية لإدارة المشاريع' : 'Official Project Management Platform'}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight">
              {t('app.ministry')}
            </h1>
            {!isAr ? <p className="mt-1 text-lg text-white/90">{t('app.ministryAr')}</p> : null}
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">
              {t('auth.heroBody')}
            </p>
          </div>
          <div className="space-y-3 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{t('auth.secureAccess')}</span>
            </div>
            <p className="text-xs text-white/60">{t('auth.authorizedOnly')}</p>
          </div>
        </aside>

        <div className="flex flex-col justify-center p-5 sm:p-8 md:p-10">
          <div className="mb-6 text-start sm:mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white lg:hidden">
              أ
            </div>
            <p className="mb-2 text-xs font-semibold text-primary lg:hidden">{t('app.ministry')}</p>
            <h2 className="text-xl font-bold text-navy sm:text-2xl">{t('auth.signInTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('auth.subtitle')}</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-navy">
                {t('auth.username')}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.usernamePlaceholder')}
                  className="h-11 ps-10"
                  disabled={submitting || loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-navy">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="h-11 ps-10 pe-10"
                  disabled={submitting || loading}
                />
                <button
                  type="button"
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button className="h-11 w-full text-sm font-semibold" disabled={submitting || loading} type="submit">
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          <p className="mt-6 text-start text-[12px] leading-relaxed text-muted">
            {t('auth.loginFooter')}
          </p>
        </div>
      </div>
    </div>
  )
}
