import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { usePeople } from '@/api/hooks'
import { useUiStore } from '@/data/ui-store'
import { useAuth } from '@/auth/AuthProvider'
import { PERSONAS } from '@/auth/personas'
import {
  ROLE_ACCESS_COPY,
  capabilitiesForRole,
  type AppRole,
} from '@/auth/permissions'

const ROLES = Object.keys(ROLE_ACCESS_COPY) as AppRole[]

export function AdminPage() {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const peopleQuery = usePeople()
  const { login, user } = useAuth()
  const navigate = useNavigate()

  if (peopleQuery.isLoading) return <PageLoading label={t('common.loading')} />
  if (peopleQuery.isError) return <PageError onRetry={() => void peopleQuery.refetch()} />

  const people = peopleQuery.data ?? []

  return (
    <div>
      <PageHeader title={t('admin.title')} description={t('admin.subtitle')} />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.roleMatrix')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ROLES.map((role) => (
              <div key={role} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-navy">{role}</p>
                <p className="text-xs text-muted">{ROLE_ACCESS_COPY[role]}</p>
                <p className="mt-2 text-[11px] text-muted">
                  {capabilitiesForRole(role).length} capabilities
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.switchPersona')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="mb-2 text-xs text-muted">
              Current: {user?.role} ({language === 'ar' ? user?.nameAr : user?.name})
            </p>
            {PERSONAS.map((p) => (
              <Button
                key={p.id}
                variant={user?.personaId === p.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => {
                  void login(p.id).then(() => {
                    toast.success(t('auth.welcome'))
                    navigate('/executive')
                  })
                }}
              >
                {language === 'ar' ? p.labelAr : p.label} — {p.role}
              </Button>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('admin.directory')}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {people.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-navy">{language === 'ar' ? p.nameAr : p.name}</p>
                  <p className="text-xs text-muted">{p.email}</p>
                </div>
                <span className="text-xs text-muted">{p.role}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
