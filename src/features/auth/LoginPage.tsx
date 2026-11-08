import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api, queryKeys } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/executive'
  const [selected, setSelected] = useState('director')
  const [submitting, setSubmitting] = useState(false)

  const personas = useQuery({
    queryKey: queryKeys.personas,
    queryFn: api.personas,
  })

  if (!loading && user) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async () => {
    setSubmitting(true)
    try {
      await login(selected)
      toast.success(t('auth.welcome'))
      navigate(from, { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('auth.loginFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const lang = i18n.language === 'ar' ? 'ar' : 'en'

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-lg shadow-[7px_7px_14px_#D9D3BF,-7px_-7px_14px_#FFFFFF]">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white">
            A
          </div>
          <CardTitle className="text-xl text-navy">{t('app.ministry')}</CardTitle>
          <p className="text-sm text-muted">{t('auth.subtitle')}</p>
          <p className="text-xs text-muted">{t('auth.mockBadge')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {(personas.data ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-start transition',
                  selected === p.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <p className="text-sm font-semibold text-navy">
                  {lang === 'ar' ? p.labelAr : p.label}
                </p>
                <p className="text-xs text-muted">{p.role}</p>
                <p className="mt-1 text-xs text-muted">{p.description}</p>
              </button>
            ))}
          </div>
          <Button className="w-full" disabled={submitting || !personas.data} onClick={() => void onSubmit()}>
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
