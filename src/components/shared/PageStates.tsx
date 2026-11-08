import { useTranslation } from 'react-i18next'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from './EmptyState'
import { cn } from '@/lib/utils'

export function PageLoading({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm">{label ?? t('common.loading')}</p>
    </div>
  )
}

export function PageError({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger/5 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" />
      <p className="text-sm font-medium text-navy">{message ?? t('common.failed')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

export function PageSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-border/50" />
      ))}
    </div>
  )
}

export function KpiSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-border/40" />
      ))}
    </div>
  )
}

export { EmptyState }
