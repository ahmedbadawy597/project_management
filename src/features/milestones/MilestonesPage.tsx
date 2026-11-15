import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock3, Flag, CircleAlert, BadgeCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { KPICard } from '@/components/shared/KPICard'
import { MilestoneTable } from './MilestoneTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useDomain } from '@/api/useDomain'
import { useAccessScope } from '@/hooks/useAccessScope'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { cn, formatDate } from '@/lib/utils'
import type { MilestoneStatus } from '@/data/types'

export function MilestonesPage() {
  const { t } = useTranslation()
  const { isScoped } = useAccessScope()
  const { state, language, isLoading, isError, refetch } = useDomain()
  const [month, setMonth] = useState('2026-11')

  const statusLabel = (status: MilestoneStatus) => {
    const key = `milestones.status${status}` as const
    return t(key)
  }

  const timeline = useMemo(
    () => [...(state?.milestones ?? [])].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate)),
    [state?.milestones],
  )

  const milestones = state?.milestones ?? []
  const total = milestones.length
  const completed = milestones.filter((m) => m.status === 'Completed' || m.status === 'Accepted').length
  const upcoming = milestones.filter((m) => m.status === 'Upcoming').length
  const delayed = milestones.filter((m) => m.status === 'Delayed').length
  const acceptanceRate = Math.round(
    (milestones.filter((m) => m.status === 'Accepted').length / Math.max(1, completed)) * 100,
  )

  const calendarItems = milestones.filter((m) => m.forecastDate.startsWith(month))

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  return (
    <div>
      <PageHeader
        title={t('milestones.title')}
        description={t(isScoped ? 'milestones.subtitleJoined' : 'milestones.subtitle')}
      />
      <div className="kpi-grid mb-6">
        <KPICard label={t('milestones.kpiTotal')} value={total} icon={Flag} delay={0} />
        <KPICard label={t('milestones.kpiCompleted')} value={completed} tone="success" icon={CheckCircle2} delay={40} />
        <KPICard label={t('milestones.kpiUpcoming')} value={upcoming} tone="info" icon={Clock3} delay={80} />
        <KPICard label={t('milestones.kpiDelayed')} value={delayed} tone="danger" icon={CircleAlert} delay={120} />
        <KPICard
          label={t('milestones.kpiAcceptance')}
          value={`${acceptanceRate}%`}
          tone="teal"
          icon={BadgeCheck}
          delay={160}
        />
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">{t('milestones.tabTimeline')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('milestones.tabCalendar')}</TabsTrigger>
          <TabsTrigger value="table">{t('milestones.tabTable')}</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <div className="relative space-y-0">
            <div className="absolute inset-y-3 start-4 w-px bg-border md:start-5" aria-hidden />
            {timeline.map((m, index) => {
              const project = state.projects.find((p) => p.id === m.projectId)
              const deliverables = language === 'ar' ? m.deliverablesAr : m.deliverables
              const tone =
                m.status === 'Delayed'
                  ? 'border-danger/30 bg-danger/5'
                  : m.status === 'Accepted' || m.status === 'Completed'
                    ? 'border-success/25 bg-success/5'
                    : 'border-border bg-surface'

              return (
                <div key={m.id} className="relative flex gap-4 pb-4 ps-0 md:gap-5">
                  <div
                    className={cn(
                      'relative z-10 mt-5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-bg',
                      m.status === 'Delayed'
                        ? 'bg-danger'
                        : m.status === 'Accepted' || m.status === 'Completed'
                          ? 'bg-success'
                          : 'bg-royal',
                    )}
                    style={{ marginInlineStart: '0.85rem' }}
                  />
                  <div
                    className={cn(
                      'min-w-0 flex-1 rounded-2xl border p-4 shadow-[4px_4px_12px_#D9D3BF20] animate-fade-up',
                      tone,
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-royal">{formatDate(m.forecastDate)}</p>
                        <p className="mt-1 text-base font-semibold text-navy">
                          {language === 'ar' ? m.nameAr : m.name}
                        </p>
                      </div>
                      <StatusBadge status={m.status} label={statusLabel(m.status)} />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      <span className="font-medium text-navy/80">{project?.code}</span>
                      <span className="mx-1.5 text-border">·</span>
                      {t('milestones.baseline')} {formatDate(m.baselineDate)}
                      {deliverables.length > 0 ? (
                        <>
                          <span className="mx-1.5 text-border">·</span>
                          {deliverables.join(language === 'ar' ? '، ' : ', ')}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>{t('milestones.calendarTitle')}</CardTitle>
              <select
                className="h-9 rounded-xl border-0 bg-bg px-3 text-sm text-navy shadow-[3px_3px_8px_#D9D3BF,-3px_-3px_8px_#FFFFFF]"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label={t('milestones.calendarTitle')}
              >
                <option value="2026-10">{t('milestones.monthOct')}</option>
                <option value="2026-11">{t('milestones.monthNov')}</option>
                <option value="2026-12">{t('milestones.monthDec')}</option>
                <option value="2027-01">{t('milestones.monthJan')}</option>
              </select>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {calendarItems.length === 0 ? (
                <p className="text-sm text-muted sm:col-span-2 lg:col-span-3">{t('milestones.emptyMonth')}</p>
              ) : (
                calendarItems.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-border/70 bg-bg/40 p-4 transition-shadow hover:shadow-[4px_4px_12px_#D9D3BF40]"
                  >
                    <p className="text-xs font-medium text-royal">{formatDate(m.forecastDate)}</p>
                    <p className="mt-1.5 text-sm font-semibold text-navy">
                      {language === 'ar' ? m.nameAr : m.name}
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={m.status} label={statusLabel(m.status)} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <MilestoneTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
