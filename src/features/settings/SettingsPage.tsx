import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUiStore } from '@/data/ui-store'
import { useResetDemo } from '@/api/hooks'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)
  const density = useUiStore((s) => s.density)
  const setDensity = useUiStore((s) => s.setDensity)
  const resetDemo = useResetDemo()

  return (
    <div>
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />
      <div className="mb-4">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {t('common.mockApi')}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language')}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              onClick={() => {
                setLanguage('en')
                void i18n.changeLanguage('en')
              }}
            >
              English
            </Button>
            <Button
              variant={language === 'ar' ? 'default' : 'outline'}
              onClick={() => {
                setLanguage('ar')
                void i18n.changeLanguage('ar')
              }}
            >
              العربية
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.layout')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant={!sidebarCollapsed ? 'default' : 'outline'}
              onClick={() => setSidebarCollapsed(false)}
            >
              Expanded sidebar
            </Button>
            <Button
              variant={sidebarCollapsed ? 'default' : 'outline'}
              onClick={() => setSidebarCollapsed(true)}
            >
              Compact sidebar
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('common.density')}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant={density === 'comfortable' ? 'default' : 'outline'}
              onClick={() => setDensity('comfortable')}
            >
              {t('common.comfortable')}
            </Button>
            <Button
              variant={density === 'compact' ? 'default' : 'outline'}
              onClick={() => setDensity('compact')}
            >
              {t('common.compact')}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.demoData')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted">{t('settings.demoHelp')}</p>
            <Button
              variant="danger"
              disabled={resetDemo.isPending}
              onClick={() => {
                resetDemo.mutate(undefined, {
                  onSuccess: () => toast.success(t('common.resetDemo')),
                  onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                })
              }}
            >
              {t('common.resetDemo')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
