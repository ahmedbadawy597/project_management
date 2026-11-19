import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderKanban,
  Gauge,
  Layers3,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ActivityFeed } from '@/components/shared/ActivityFeed'
import { EmptyState } from '@/components/shared/EmptyState'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { axisProps, chartTheme, gridProps } from '@/components/charts/theme'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDomain } from '@/api/useDomain'
import {
  deliveryTimeline,
  enrichProject,
  executiveInsights,
  getPortfolioKpis,
  personName,
  plannedVsActual,
  statusDistribution,
} from '@/data/selectors'
import { computeAppDashboardMetrics } from '@/lib/app-dashboard-metrics'
import { cn, formatDate, formatPercent } from '@/lib/utils'
import { KpiSkeletonGrid, PageError } from '@/components/shared/PageStates'
import { useDirection } from '@/hooks/useDirection'

type DashMode = 'projects' | 'apps'

function Metric({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}) {
  const valueClass =
    tone === 'good'
      ? 'text-success'
      : tone === 'warn'
        ? 'text-warning'
        : tone === 'bad'
          ? 'text-danger'
          : 'text-navy'
  return (
    <div className="min-w-0 border-e border-border/60 px-3 py-2 last:border-e-0 sm:px-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums sm:text-2xl', valueClass)}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  )
}

function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('border border-border/70 bg-surface/40', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">{title}</h2>
          {description ? <p className="mt-0.5 text-[11px] text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function ExecutivePage() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language.startsWith('ar')
  const { isRtl } = useDirection()
  const { state, language, isLoading, isError, refetch } = useDomain()
  const [mode, setMode] = useState<DashMode>('projects')
  const [entityId, setEntityId] = useState('all')
  const [dateFilter, setDateFilter] = useState('30')
  const xAxisProps = { ...axisProps, reversed: isRtl }
  const yAxisProps = { ...axisProps, orientation: isRtl ? ('right' as const) : ('left' as const) }

  const derived = useMemo(() => {
    if (!state) return null
    const kpis = getPortfolioKpis(state)
    const projects = state.projects.map((p) => enrichProject(state, p))
    const apps = [...(state.apps ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const appMetrics = apps.map((app) => ({
      app,
      metrics: computeAppDashboardMetrics(app, state.wbs),
    }))
    return {
      kpis,
      projects,
      apps,
      appMetrics,
      insights: executiveInsights(state),
      statusData: statusDistribution(state).filter((d) => d.value > 0),
      progressData: plannedVsActual(state),
      timeline: deliveryTimeline(state),
    }
  }, [state])

  const scoped = useMemo(() => {
    if (!derived || !state) return null
    if (mode === 'projects') {
      const projects =
        entityId === 'all' ? derived.projects : derived.projects.filter((p) => p.id === entityId)
      const projectIds = new Set(projects.map((p) => p.id))
      const apps = derived.apps.filter((a) => projectIds.has(a.projectId))
      const codes = new Set(projects.map((p) => p.code.replace('AWQ-APP-', '')))
      const progressData =
        entityId === 'all'
          ? derived.progressData
          : derived.progressData.filter((d) => codes.has(d.name) || projects.some((p) => p.code === d.name))
      const timeline =
        entityId === 'all' ? derived.timeline : derived.timeline.filter((d) => projectIds.has(d.id))
      const statusData =
        entityId === 'all'
          ? derived.statusData
          : statusDistribution({ ...state, projects: projects.map((p) => p) }).filter(
              (d) => d.value > 0,
            )
      return { projects, apps, progressData, timeline, statusData, appMetrics: derived.appMetrics.filter((m) => projectIds.has(m.app.projectId)) }
    }
    const apps = entityId === 'all' ? derived.apps : derived.apps.filter((a) => a.id === entityId)
    const appMetrics =
      entityId === 'all'
        ? derived.appMetrics
        : derived.appMetrics.filter((m) => m.app.id === entityId)
    const projectIds = new Set(apps.map((a) => a.projectId))
    const projects = derived.projects.filter((p) => projectIds.has(p.id))
    return {
      projects,
      apps,
      progressData: derived.progressData.filter((d) => projects.some((p) => p.code === d.name)),
      timeline: derived.timeline.filter((d) => projectIds.has(d.id)),
      statusData: derived.statusData,
      appMetrics,
    }
  }, [derived, entityId, mode, state])

  const activities = useMemo(() => {
    if (!state || !scoped) return []
    const cutoff = Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000
    const projectIds = new Set(scoped.projects.map((p) => p.id))
    return state.activities
      .filter((a) => projectIds.has(a.projectId))
      .filter((a) => new Date(a.at).getTime() >= cutoff)
      .slice(0, 10)
  }, [state, scoped, dateFilter])

  if (isLoading) return <KpiSkeletonGrid />
  if (isError || !state || !derived || !scoped) return <PageError onRetry={refetch} />

  const { kpis, insights } = derived
  const statusTotal = scoped.statusData.reduce((s, d) => s + d.value, 0)
  const statusDataLocalized = scoped.statusData.map((d) => ({
    ...d,
    name: t(`status.${d.name}`, { defaultValue: d.name }),
  }))

  const avgAppReadiness =
    scoped.appMetrics.length === 0
      ? 0
      : Math.round(
          scoped.appMetrics.reduce((s, m) => s + m.metrics.overallProgress, 0) /
            scoped.appMetrics.length,
        )
  const appsOperating = scoped.apps.filter(
    (a) => a.publishStatus === 'Published' || a.publishStatus === 'يعمل',
  ).length
  const appsNeedUpdate = scoped.apps.length - appsOperating
  const totalUsers = scoped.apps.reduce((s, a) => s + (a.userCount ?? 0), 0)

  const projectProgressAvg =
    scoped.projects.length === 0
      ? 0
      : Math.round(
          scoped.projects.reduce((s, p) => s + (p.actualProgress ?? 0), 0) / scoped.projects.length,
        )

  const hasUpcomingMilestones = insights.approachingMilestones.length > 0
  const hasInsightContent =
    hasUpcomingMilestones ||
    Boolean(insights.scheduleVarianceProject) ||
    insights.resourcePlanningNeeded > 0 ||
    Boolean(insights.criticalIssue) ||
    insights.readyForInitiation.length > 0

  const onModeChange = (next: DashMode) => {
    setMode(next)
    setEntityId('all')
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title={t('executive.title')}
        description={t('executive.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border/70 bg-bg p-0.5">
              <button
                type="button"
                onClick={() => onModeChange('projects')}
                className={cn(
                  'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors',
                  mode === 'projects' ? 'bg-primary text-white' : 'text-muted hover:text-navy',
                )}
              >
                <FolderKanban className="h-3.5 w-3.5" />
                {t('executive.viewProjects')}
              </button>
              <button
                type="button"
                onClick={() => onModeChange('apps')}
                className={cn(
                  'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors',
                  mode === 'apps' ? 'bg-primary text-white' : 'text-muted hover:text-navy',
                )}
              >
                <Layers3 className="h-3.5 w-3.5" />
                {t('executive.viewApps')}
              </button>
            </div>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger className="min-h-10 w-[min(100%,14rem)]">
                <SelectValue
                  placeholder={
                    mode === 'projects' ? t('executive.selectProject') : t('executive.selectApp')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {mode === 'projects' ? t('common.allProjects') : t('executive.allApps')}
                </SelectItem>
                {mode === 'projects'
                  ? derived.projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code}
                      </SelectItem>
                    ))
                  : derived.apps.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {isAr ? a.nameAr || a.name : a.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="overflow-x-auto border border-border/70 bg-surface/30">
        <div className="flex min-w-[40rem] divide-x divide-border/60">
          {mode === 'projects' ? (
            <>
              <Metric label={t('executive.totalProjects')} value={scoped.projects.length} />
              <Metric
                label={t('executive.active')}
                value={scoped.projects.filter((p) => p.status === 'Active').length}
                tone="good"
              />
              <Metric
                label={t('executive.progress')}
                value={formatPercent(projectProgressAvg)}
                hint={`${t('executive.planned')} ${formatPercent(kpis.overallPlannedProgress)}`}
              />
              <Metric
                label={t('executive.overdueTasks')}
                value={kpis.overdueTasks}
                tone={kpis.overdueTasks > 0 ? 'bad' : 'default'}
              />
              <Metric label={t('executive.teamMembers')} value={kpis.totalTeamMembers} />
            </>
          ) : (
            <>
              <Metric label={t('executive.totalApps')} value={scoped.apps.length} />
              <Metric label={t('executive.appsOperating')} value={appsOperating} tone="good" />
              <Metric
                label={t('executive.appsNeedUpdate')}
                value={appsNeedUpdate}
                tone={appsNeedUpdate > 0 ? 'warn' : 'default'}
              />
              <Metric label={t('executive.readiness')} value={formatPercent(avgAppReadiness)} />
              <Metric label={t('executive.users')} value={totalUsers.toLocaleString(isAr ? 'ar-EG' : 'en-US')} />
            </>
          )}
        </div>
      </div>

      {mode === 'projects' ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel title={t('executive.projectsTable')} description={t('executive.projectsTableHint')}>
            {scoped.projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title={t('executive.noChartData')}
                description={t('executive.noChartDataBody')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
                      <th className="px-2 py-2 text-start font-medium">{t('common.code')}</th>
                      <th className="px-2 py-2 text-start font-medium">{t('common.project')}</th>
                      <th className="px-2 py-2 text-start font-medium">{t('common.status')}</th>
                      <th className="px-2 py-2 text-start font-medium">{t('common.progress')}</th>
                      <th className="px-2 py-2 text-start font-medium">{t('common.manager')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoped.projects.map((p) => (
                      <tr key={p.id} className="border-b border-border/40 last:border-0">
                        <td className="px-2 py-2.5">
                          <Link to={`/projects/${p.id}`} className="font-semibold text-royal hover:underline">
                            {p.code}
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-navy">
                          {language === 'ar' ? p.nameAr : p.name}
                        </td>
                        <td className="px-2 py-2.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex min-w-[7rem] items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/70">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${Math.max(3, Math.min(100, p.actualProgress ?? 0))}%`,
                                }}
                              />
                            </div>
                            <span className="tabular-nums text-xs font-semibold text-navy">
                              {formatPercent(p.actualProgress ?? 0)}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-muted">
                          {language === 'ar'
                            ? p.managerNameAr || p.managerName || '—'
                            : p.managerName || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title={t('executive.statusDist')} description={t('executive.statusDistHint')}>
            <div className="h-[240px]">
              {statusTotal === 0 ? (
                <EmptyState
                  icon={Gauge}
                  title={t('executive.noChartData')}
                  description={t('executive.noChartDataBody')}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDataLocalized}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {statusDataLocalized.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend verticalAlign="bottom" height={28} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <Panel
            title={t('executive.plannedVsActual')}
            description={t('executive.plannedVsActualHint')}
            className="xl:col-span-2"
          >
            <div className="h-[260px]">
              {scoped.progressData.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title={t('executive.noChartData')}
                  description={t('executive.noChartDataBody')}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoped.progressData} barGap={6} barCategoryGap="28%">
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="name" {...xAxisProps} />
                    <YAxis {...yAxisProps} unit="%" />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                    <Legend iconType="circle" />
                    <Bar
                      dataKey="planned"
                      name={t('executive.planned')}
                      fill={chartTheme.planned}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="actual"
                      name={t('executive.actual')}
                      fill={chartTheme.actual}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <Panel
            title={t('executive.deliveryTimeline')}
            description={t('executive.deliveryTimelineHint')}
            className="xl:col-span-2"
          >
            {scoped.timeline.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title={t('executive.noChartData')}
                description={t('executive.noChartDataBody')}
              />
            ) : (
              <ul className="space-y-3">
                {scoped.timeline.slice(0, 8).map((item) => (
                  <li key={item.id} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-navy">{item.code}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-border/70">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, item.progress)}%` }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-muted">
                      {formatDate(item.start)} → {formatDate(item.end)} · {item.progress}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel title={t('executive.appsOverview')} description={t('executive.appsOverviewHint')}>
            {scoped.appMetrics.length === 0 ? (
              <EmptyState
                icon={Layers3}
                title={t('executive.noChartData')}
                description={t('executive.noChartDataBody')}
              />
            ) : (
              <ul className="divide-y divide-border/50">
                {scoped.appMetrics.map(({ app, metrics }) => {
                  const pm = app.ownerId
                    ? personName(state, app.ownerId, language === 'ar' ? 'ar' : 'en')
                    : null
                  const name = language === 'ar' ? app.nameAr || app.name : app.name
                  return (
                    <li key={app.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: app.iconColor || '#0F766E' }}
                      >
                        {name.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/apps/${app.id}`}
                            className="truncate text-sm font-semibold text-navy hover:text-primary"
                          >
                            {name}
                          </Link>
                          {app.publishStatus ? (
                            <span className="rounded bg-teal/10 px-1.5 py-0.5 text-[10px] text-teal">
                              {app.publishStatus}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {t('common.pm')}: {pm ?? t('executive.unassignedPm')}
                          <span className="mx-1 text-border">·</span>
                          {t('executive.users')}: {(app.userCount ?? 0).toLocaleString()}
                          {metrics.delayDays > 0 ? (
                            <>
                              <span className="mx-1 text-border">·</span>
                              <span className="text-danger">
                                {t('appDashboard.delayDays')}: {metrics.delayDays}
                              </span>
                            </>
                          ) : null}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/70">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.max(4, metrics.overallProgress)}%`,
                              }}
                            />
                          </div>
                          <span className="tabular-nums text-[11px] font-semibold text-navy">
                            {formatPercent(metrics.overallProgress)}
                          </span>
                        </div>
                      </div>
                      {app.url ? (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-royal hover:opacity-80"
                          aria-label={t('executive.openApp')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel title={t('executive.appReadinessChart')} description={t('executive.appReadinessHint')}>
            <div className="h-[280px]">
              {scoped.appMetrics.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title={t('executive.noChartData')}
                  description={t('executive.noChartDataBody')}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scoped.appMetrics.map(({ app, metrics }) => ({
                      name: app.code,
                      readiness: metrics.overallProgress,
                      planned: metrics.plannedProgress,
                    }))}
                    barGap={4}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="name" {...xAxisProps} />
                    <YAxis {...yAxisProps} unit="%" domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                    <Legend iconType="circle" />
                    <Bar
                      dataKey="planned"
                      name={t('executive.planned')}
                      fill={chartTheme.planned}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="readiness"
                      name={t('executive.readiness')}
                      fill={chartTheme.actual}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          {entityId !== 'all' && scoped.appMetrics[0] ? (
            <Panel
              title={t('executive.appPhases')}
              description={t('executive.appPhasesHint')}
              className="xl:col-span-2"
            >
              {scoped.appMetrics[0].metrics.phases.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title={t('executive.noChartData')}
                  description={t('appDashboard.noPhases')}
                />
              ) : (
                <ul className="space-y-3">
                  {scoped.appMetrics[0].metrics.phases.map((phase) => {
                    const name = isAr ? phase.nameAr || phase.name : phase.name
                    return (
                      <li
                        key={phase.id}
                        className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr_auto] sm:items-center"
                      >
                        <p className="truncate text-sm font-medium text-navy">{name}</p>
                        <div className="h-2 overflow-hidden rounded-full bg-border/70">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              phase.status === 'completed'
                                ? 'bg-success'
                                : phase.status === 'delayed'
                                  ? 'bg-danger'
                                  : phase.status === 'in_progress'
                                    ? 'bg-warning'
                                    : 'bg-border',
                            )}
                            style={{ width: `${Math.max(4, phase.progress)}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-xs font-semibold text-navy">
                          {formatPercent(phase.progress)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={t('executive.insights')}>
          {!hasInsightContent ? (
            <EmptyState
              icon={TrendingUp}
              title={t('executive.noInsights')}
              description={t('executive.noInsightsBody')}
            />
          ) : (
            <ul className="space-y-3">
              {hasUpcomingMilestones ? (
                <Insight
                  tone="info"
                  title={t('executive.insight1')}
                  body={insights.approachingMilestones
                    .map((m) => `${language === 'ar' ? m.nameAr : m.name} (${formatDate(m.forecastDate)})`)
                    .join(' · ')}
                />
              ) : null}
              {insights.scheduleVarianceProject ? (
                <Insight
                  tone="danger"
                  title={t('executive.insight2')}
                  body={`${insights.scheduleVarianceProject.code}: ${insights.scheduleVarianceProject.actualProgress}% / ${insights.scheduleVarianceProject.plannedProgress}% (${insights.scheduleVarianceProject.scheduleVariance} pp).`}
                />
              ) : null}
              {insights.resourcePlanningNeeded > 0 ? (
                <Insight tone="warning" title={t('executive.insight3')} body={t('resources.capacityWatchBody')} />
              ) : null}
              {insights.criticalIssue ? (
                <Insight
                  tone="danger"
                  title={t('executive.insight4')}
                  body={language === 'ar' ? insights.criticalIssue.titleAr : insights.criticalIssue.title}
                />
              ) : null}
              {insights.readyForInitiation.length > 0 ? (
                <Insight
                  tone="teal"
                  title={t('executive.insight5')}
                  body={insights.readyForInitiation.map((p) => p.code).join(', ')}
                />
              ) : null}
            </ul>
          )}
        </Panel>

        <Panel
          title={t('executive.activity')}
          action={
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9 w-[7.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('executive.days7')}</SelectItem>
                <SelectItem value="30">{t('executive.days30')}</SelectItem>
                <SelectItem value="90">{t('executive.days90')}</SelectItem>
                <SelectItem value="365">{t('executive.days365')}</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          {activities.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title={t('executive.noActivity')}
              description={t('executive.noActivityBody')}
            />
          ) : (
            <ActivityFeed items={activities} />
          )}
        </Panel>
      </div>
    </div>
  )
}

function Insight({
  title,
  body,
  tone = 'info',
}: {
  title: string
  body: string
  tone?: 'info' | 'warning' | 'danger' | 'teal'
}) {
  const accent = {
    info: 'border-s-primary',
    warning: 'border-s-warning',
    danger: 'border-s-danger',
    teal: 'border-s-teal',
  }
  return (
    <li className={cn('border-s-2 bg-bg/50 px-3 py-2.5', accent[tone])}>
      <p className="text-sm font-semibold text-navy">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
    </li>
  )
}
