import { useTranslation } from 'react-i18next'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { HealthStatus, ProjectStatus, SlaStatus, MilestoneStatus, ApprovalStatus, TaskStatus } from '@/data/types'

type AnyStatus = ProjectStatus | HealthStatus | SlaStatus | MilestoneStatus | ApprovalStatus | TaskStatus | string

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-bg text-text border-line',
        success: 'bg-primary/10 text-primary border-primary/15',
        warning: 'bg-warning/10 text-warning border-warning/20',
        danger: 'bg-danger/10 text-danger border-danger/15',
        info: 'bg-primary/10 text-primary border-primary/15',
        navy: 'bg-navy/8 text-navy border-navy/10',
        teal: 'bg-teal/10 text-teal border-teal/15',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const dots: Record<string, string> = {
  success: 'bg-primary',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
  navy: 'bg-navy',
  teal: 'bg-teal',
  default: 'bg-muted',
}

export function StatusBadge({ status, label }: { status: AnyStatus; label?: string }) {
  const { t, i18n } = useTranslation()
  const map: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    Active: 'info',
    Planned: 'navy',
    Completed: 'success',
    'On Hold': 'warning',
    'On Track': 'success',
    'At Risk': 'warning',
    Delayed: 'danger',
    'Not Started': 'default',
    'Ahead of Schedule': 'teal',
    Warning: 'warning',
    Breached: 'danger',
    Met: 'success',
    Upcoming: 'info',
    Accepted: 'success',
    Pending: 'warning',
    Approved: 'success',
    Rejected: 'danger',
    Backlog: 'default',
    'To Do': 'navy',
    'In Progress': 'info',
    'In Review': 'teal',
    Blocked: 'danger',
    Open: 'warning',
    Mitigating: 'info',
    Closed: 'success',
    Critical: 'danger',
    High: 'warning',
    Medium: 'info',
    Low: 'success',
  }
  const variant = map[status] ?? 'default'
  const key = `status.${status}`
  const translated = label ?? (i18n.exists(key) ? t(key) : String(status))
  return (
    <span className={cn(badgeVariants({ variant }))}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dots[variant ?? 'default'])} />
      {translated}
    </span>
  )
}
