import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { HealthStatus } from '@/data/types'

export function HealthIndicator({ health, showLabel = true }: { health: HealthStatus; showLabel?: boolean }) {
  const { t, i18n } = useTranslation()
  const color =
    health === 'On Track' || health === 'Completed'
      ? 'bg-success'
      : health === 'At Risk'
        ? 'bg-warning'
        : health === 'Delayed'
          ? 'bg-danger'
          : 'bg-muted'
  const pulse = health === 'Delayed' || health === 'At Risk'
  const key = `status.${health}`
  const label = i18n.exists(key) ? t(key) : health
  return (
    <span className="inline-flex items-center gap-2 text-sm text-text">
      <span className="relative flex h-2.5 w-2.5">
        {pulse ? <span className={cn('absolute inset-0 animate-ping rounded-full opacity-40', color)} /> : null}
        <span className={cn('relative h-2.5 w-2.5 rounded-full', color)} />
      </span>
      {showLabel ? <span className="font-medium">{label}</span> : null}
    </span>
  )
}
