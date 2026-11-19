import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, CalendarClock, CalendarDays, Clock3, Users } from 'lucide-react'
import type { ProjectApp, WbsItem } from '@/data/types'
import {
  computeAppDashboardMetrics,
  type AppDashboardMetrics,
  type PhaseBarStatus,
} from '@/lib/app-dashboard-metrics'
import { useAppDashboard } from '@/api/hooks'
import { cn, formatDate, formatPercent } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

function statusTone(status: PhaseBarStatus) {
  switch (status) {
    case 'completed':
      return 'bg-success'
    case 'in_progress':
      return 'bg-warning'
    case 'delayed':
      return 'bg-danger'
    default:
      return 'bg-border'
  }
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  hint: string
  icon: typeof Users
  tone?: 'default' | 'teal' | 'warning' | 'success' | 'violet'
}) {
  const iconBg = {
    default: 'bg-primary/10 text-primary',
    teal: 'bg-teal/10 text-teal',
    warning: 'bg-warning/15 text-warning',
    success: 'bg-success/10 text-success',
    violet: 'bg-[#6D28D9]/10 text-[#6D28D9]',
  }[tone]

  return (
    <div className="neo flex min-h-[7.5rem] flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className={cn('rounded-xl p-2', iconBg)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums text-navy sm:text-2xl">{value}</p>
        <p className="mt-1 text-[11px] text-muted">{hint}</p>
      </div>
    </div>
  )
}

export function AppProgressDashboard({
  app,
  wbs,
  description,
}: {
  app: ProjectApp
  wbs: WbsItem[]
  description: string
}) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language.startsWith('ar')
  const remote = useAppDashboard(app.id)

  const local = useMemo(() => computeAppDashboardMetrics(app, wbs), [app, wbs])
  const metrics: AppDashboardMetrics = remote.data ?? local

  const title = isAr ? app.nameAr || app.name : app.name
  const ministry = t('app.ministry')

  return (
    <div className="space-y-4">
      <section
        className="relative overflow-hidden rounded-2xl px-5 py-7 text-white sm:px-8 sm:py-9"
        style={{
          background:
            'linear-gradient(155deg, #14532D 0%, #1F6B47 48%, #0F766E 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff6 0, transparent 40%), radial-gradient(circle at 80% 0%, #fff3 0, transparent 35%)',
          }}
        />
        <p className="relative text-xs font-semibold tracking-wide text-white/80">{ministry}</p>
        <h2 className="relative mt-2 text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">
          {title}
        </h2>
        <p className="relative mt-2 max-w-3xl text-sm text-white/85">{t('appDashboard.aboutApp')}</p>
        {description ? (
          <p className="relative mt-1 max-w-3xl text-sm text-white/70 line-clamp-2">{description}</p>
        ) : null}
        {metrics.hasPlan ? (
          <p className="relative mt-3 text-[11px] font-medium text-white/70">
            {t('appDashboard.autoFromPlan')}
          </p>
        ) : (
          <p className="relative mt-3 text-[11px] font-medium text-white/70">
            {t('appDashboard.noPlanHint')}
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label={t('appDashboard.overallProgress')}
          value={formatPercent(metrics.overallProgress)}
          hint={t('appDashboard.vsPlanned', { value: formatPercent(metrics.plannedProgress) })}
          icon={BarChart3}
          tone="success"
        />
        <Kpi
          label={t('appDashboard.delayDays')}
          value={String(metrics.delayDays)}
          hint={t('appDashboard.vsPlan')}
          icon={CalendarDays}
          tone={metrics.delayDays > 0 ? 'warning' : 'teal'}
        />
        <Kpi
          label={t('appDashboard.users')}
          value={metrics.userCount.toLocaleString(isAr ? 'ar-EG' : 'en-US')}
          hint={t('appDashboard.usersHint')}
          icon={Users}
          tone="warning"
        />
        <Kpi
          label={t('appDashboard.startDate')}
          value={metrics.plannedStart ? formatDate(metrics.plannedStart) : '—'}
          hint={t('appDashboard.startHint')}
          icon={CalendarClock}
          tone="teal"
        />
        <Kpi
          label={t('appDashboard.launchDate')}
          value={metrics.plannedEnd ? formatDate(metrics.plannedEnd) : '—'}
          hint={t('appDashboard.launchHint')}
          icon={Clock3}
          tone="violet"
        />
      </div>

      <section className="neo p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-navy">{t('appDashboard.phasesTitle')}</h3>
            <p className="mt-1 text-xs text-muted">{t('appDashboard.phasesHint')}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted">
            {(
              [
                ['completed', t('appDashboard.statusCompleted')],
                ['in_progress', t('appDashboard.statusInProgress')],
                ['delayed', t('appDashboard.statusDelayed')],
                ['not_started', t('appDashboard.statusNotStarted')],
              ] as const
            ).map(([key, label]) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', statusTone(key))} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {metrics.phases.length === 0 ? (
          <p className="rounded-xl bg-bg/70 px-4 py-8 text-center text-sm text-muted">
            {t('appDashboard.noPhases')}
          </p>
        ) : (
          <ul className="space-y-4">
            {metrics.phases.map((phase) => {
              const name = isAr ? phase.nameAr || phase.name : phase.name
              return (
                <li key={phase.id} className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{name}</p>
                    {phase.weightPct != null ? (
                      <p className="text-[11px] text-muted">
                        {t('appDashboard.weight', { value: phase.weightPct })}
                      </p>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Progress
                      value={phase.progress}
                      className="h-3"
                      indicatorClassName={statusTone(phase.status)}
                    />
                  </div>
                  <span className="tabular-nums text-sm font-semibold text-navy sm:min-w-[3.5rem] sm:text-end">
                    {formatPercent(phase.progress)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
