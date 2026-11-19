import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUiStore } from '@/data/ui-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const fieldClass =
  'h-12 rounded-2xl border-border/70 bg-white/70 text-[15px] shadow-[inset_3px_3px_8px_rgba(217,211,191,0.45),inset_-2px_-2px_6px_rgba(255,255,255,0.9)] placeholder:text-muted/80 focus-visible:border-primary/30 focus-visible:bg-white focus-visible:ring-primary/20'

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
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

  const isAr = i18n.language.startsWith('ar')
  const busy = submitting || loading

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#E8E4D8] px-4 py-8 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 0% 0%, rgba(15,118,110,0.16), transparent 55%), radial-gradient(ellipse 55% 40% at 100% 100%, rgba(31,107,71,0.12), transparent 50%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(31,46,38,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(31,46,38,0.035) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 45%, #000 20%, transparent 75%)',
        }}
      />

      <div className="relative w-full max-w-[980px]">
        <div className="mb-4 flex items-center justify-end">
          <div className="inline-flex rounded-xl bg-bg p-1 shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF]">
            {(['ar', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setLanguage(lang)
                  void i18n.changeLanguage(lang)
                }}
                className={cn(
                  'min-h-8 rounded-lg px-3 text-xs font-bold transition',
                  language === lang ? 'bg-primary text-white' : 'text-muted hover:text-navy',
                )}
              >
                {lang === 'ar' ? 'عربي' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid overflow-hidden rounded-[1.75rem] border border-[#D9D3BF]/90 bg-[#F3F0E6]/95 shadow-[0_28px_70px_rgba(31,46,38,0.14)] lg:grid-cols-[1.08fr_0.92fr]">
          <aside className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-12">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(155deg, #14532D 0%, #1F6B47 48%, #0F766E 100%)',
              }}
            />
            <div
              className="pointer-events-none absolute -end-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 -start-10 h-72 w-72 rounded-full bg-teal-300/10 blur-3xl"
              aria-hidden
            />

            <div className="relative">
              <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-sm">
                أ
              </div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white/65 uppercase">
                {isAr ? 'المنصة الرسمية لإدارة المشاريع' : 'Official PPM Platform'}
              </p>
              <h1 className="mt-3 max-w-md text-[2rem] font-bold leading-[1.2] tracking-tight xl:text-[2.15rem]">
                {t('app.ministry')}
              </h1>
              {!isAr ? (
                <p className="mt-2 text-lg font-medium text-white/90">{t('app.ministryAr')}</p>
              ) : null}
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/80">
                {t('auth.heroBody')}
              </p>
            </div>

            <div className="relative space-y-4 border-t border-white/15 pt-6">
              <div className="flex items-start gap-3 text-sm text-white/85">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/12">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-white">{t('auth.secureAccess')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{t('auth.authorizedOnly')}</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="relative flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 md:px-10 lg:px-11">
            <div className="mb-8">
              <div className="mb-5 flex items-center gap-3 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-[4px_4px_10px_#D9D3BF]">
                  أ
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy">{t('app.ministry')}</p>
                  <p className="truncate text-[11px] text-muted">{t('app.fullName')}</p>
                </div>
              </div>

              <div className="mb-2 h-1.5 w-10 rounded-full bg-primary" aria-hidden />
              <h2 className="text-[1.35rem] font-bold tracking-tight text-navy sm:text-2xl">
                {t('auth.signInTitle')}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                {t('auth.subtitle')}
              </p>
            </div>

            <form className="space-y-5" onSubmit={(e) => void onSubmit(e)} noValidate>
              <div className="space-y-2">
                <label htmlFor="username" className="text-[13px] font-semibold text-navy">
                  {t('auth.username')}
                </label>
                <div className="relative" dir={isAr ? 'rtl' : 'ltr'}>
                  <User className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    dir={isAr ? 'rtl' : 'ltr'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('auth.usernamePlaceholder')}
                    className={cn(fieldClass, 'ps-11 pe-3 text-start')}
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[13px] font-semibold text-navy">
                  {t('auth.password')}
                </label>
                <div className="relative" dir={isAr ? 'rtl' : 'ltr'}>
                  <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    dir={isAr ? 'rtl' : 'ltr'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className={cn(fieldClass, 'ps-11 pe-11 text-start')}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="absolute end-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-bg hover:text-navy"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                className="mt-1 h-12 w-full text-[15px] font-bold tracking-wide"
                disabled={busy}
                type="submit"
              >
                {busy ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>

            <div className="mt-8 border-t border-border/60 pt-5">
              <p className="text-[12px] leading-relaxed text-muted">{t('auth.loginFooter')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
