import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'

export function KPICard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  trend,
  delay = 0,
  className,
  featured = false,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal'
  trend?: { value: string; positive?: boolean }
  delay?: number
  className?: string
  featured?: boolean
}) {
  const numeric = typeof value === 'number' ? value : null
  const stringValue = typeof value === 'string' ? value : null
  const percentMatch = stringValue?.match(/^([\d.]+)%$/)
  const animatePercent = percentMatch ? Number(percentMatch[1]) : null

  const iconTone = {
    default: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-danger bg-danger/10',
    info: 'text-primary bg-primary/10',
    teal: 'text-teal bg-teal/10',
  }

  return (
    <div
      className={cn(
        'group relative p-3 transition-all duration-300 animate-fade-up sm:p-4',
        featured ? 'neo-primary text-white' : 'neo text-navy',
        'hover:-translate-y-0.5',
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn('text-start text-xs font-medium', featured ? 'text-white/80' : 'text-muted')}>
          {label}
        </p>
        {Icon ? (
          <div
            className={cn(
              'rounded-xl p-2.5',
              featured ? 'bg-white/15 text-white' : iconTone[tone],
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        ) : null}
      </div>

      <p
        className={cn(
          'mt-3 text-start text-[1.5rem] font-bold leading-none tabular-nums sm:mt-4 sm:text-[2rem]',
          featured ? 'text-white' : 'text-navy',
        )}
      >

        {numeric != null ? (
          <AnimatedNumber value={numeric} />
        ) : animatePercent != null ? (
          <>
            <AnimatedNumber value={animatePercent} />
            <bdi>%</bdi>
          </>
        ) : (
          value
        )}
      </p>

      {hint ? (
        <p className={cn('mt-2 text-start text-xs leading-snug', featured ? 'text-white/70' : 'text-muted')}>
          {hint}
        </p>
      ) : null}

      {trend ? (
        <p
          className={cn(
            'mt-2 inline-flex items-center rounded-lg px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
            featured
              ? 'bg-white/15 text-white'
              : trend.positive
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger',
          )}
        >
          {trend.value}
        </p>
      ) : null}
    </div>
  )
}
