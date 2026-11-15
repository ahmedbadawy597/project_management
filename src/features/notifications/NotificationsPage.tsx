import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/api/hooks'
import { useAccessScope } from '@/hooks/useAccessScope'
import { useUiStore } from '@/data/ui-store'
import { cn, formatDate } from '@/lib/utils'

export function NotificationsPage() {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const { isScoped } = useAccessScope()
  const query = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const navigate = useNavigate()

  if (query.isLoading) return <PageLoading label={t('common.loading')} />
  if (query.isError) return <PageError onRetry={() => void query.refetch()} />

  const notifications = query.data ?? []

  return (
    <div>
      <PageHeader
        title={t('notifications.title')}
        description={t(isScoped ? 'notifications.subtitleJoined' : 'notifications.subtitle')}
        actions={
          <Button variant="outline" onClick={() => markAll.mutate()}>
            {t('common.markAllRead')}
          </Button>
        }
      />
      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            className={cn(
              'w-full rounded-xl border border-border p-4 text-start transition hover:border-royal/40',
              n.read ? 'bg-surface' : 'bg-royal/5',
            )}
            onClick={() => {
              markRead.mutate(n.id)
              if (n.href) navigate(n.href)
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-navy">
                  {language === 'ar' ? n.titleAr : n.title}
                </p>
                <p className="mt-1 text-xs text-muted">{language === 'ar' ? n.bodyAr : n.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted">{formatDate(n.at, 'dd MMM HH:mm')}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
