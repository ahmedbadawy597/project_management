import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderKanban,
  Gauge,
  Layers3,
  PauseCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
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
import { KPICard } from '@/components/shared/KPICard'
import { ChartCard } from '@/components/shared/ChartCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ActivityFeed } from '@/components/shared/ActivityFeed'
import { EmptyState } from '@/components/shared/EmptyState'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { axisProps, chartTheme, gridProps } from '@/components/charts/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDomain } from '@/api/useDomain'
import {
  budgetByProject,
  deliveryTimeline,
  executiveInsights,
  getPortfolioKpis,
  monthlyMilestoneCompletion,
  personName,
  plannedVsActual,
  pmPerformance,
  riskSeverityDistribution,
  statusDistribution,
} from '@/data/selectors'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'
import { KpiSkeletonGrid, PageError } from '@/components/shared/PageStates'
import { useDirection } from '@/hooks/useDirection'

const RISK_COLORS = ['#2F8159', '#1F6B47', '#C4922A', '#C45C4A']

export function ExecutivePage() {
  const { t } = useTranslation()
  const { isRtl } = useDirection()
  const { state, language, isLoading, isError, refetch } = useDomain()
  const [projectFilter, setProjectFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('30')
  const xAxisProps = { ...axisProps, reversed: isRtl }
  const yAxisProps = { ...axisProps, orientation: isRtl ? ('right' as const) : ('left' as const) }

  const derived = useMemo(() => {
    if (!state) return null
    const kpis = getPortfolioKpis(state)
    return {
      kpis,
      insights: executiveInsights(state),
      statusData: statusDistribution(state).filter((d) => d.value > 0),
      progressData: plannedVsActual(state),
      riskData: riskSeverityDistribution(state),
      pmData: pmPerformance(state),
      budgetData: budgetByProject(state),
      milestoneData: monthlyMilestoneCompletion(state),
      timeline: deliveryTimeline(state),
      apps: [...(state.apps ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }
  }, [state])

  const activities = useMemo(() => {
    if (!state) return []
    const cutoff = Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000
    return state.activities
      .filter((a) => (projectFilter === 'all' ? true : a.projectId === projectFilter))
      .filter((a) => new Date(a.at).getTime() >= cutoff)
      .slice(0, 12)
  }, [state, projectFilter, dateFilter])

  if (isLoading) return <KpiSkeletonGrid />
  if (isError || !state || !derived) return <PageError onRetry={refetch} />

  const {
    kpis,
    insights,
    statusData,
    progressData,
    riskData,
    pmData,
    budgetData,
    milestoneData,
    timeline,
    apps,
  } = derived
  const statusTotal = statusData.reduce((s, d) => s + d.value, 0)
  const statusDataLocalized = statusData.map((d) => ({
    ...d,
    name: t(`status.${d.name}`, { defaultValue: d.name }),
  }))
  const riskDataLocalized = riskData.map((d) => ({
    ...d,
    name: t(`status.${d.name}`, { defaultValue: d.name }),
  }))
  const riskTotal = riskDataLocalized.reduce((s, d) => s + d.value, 0)

  const slaSeries = kpis.active.map((p) => ({
    name: p.code.replace('AWQ-APP-', '').replace('AWQAF-', ''),
    sla: p.slaCompliance,
  }))

  const hasUpcomingMilestones = insights.approachingMilestones.length > 0
  const hasInsightContent =
    hasUpcomingMilestones ||
    Boolean(insights.scheduleVarianceProject) ||
    insights.resourcePlanningNeeded > 0 ||
    Boolean(insights.criticalIssue) ||
    insights.readyForInitiation.length > 0

  return (
    <div className="page-enter">
      <PageHeader title={t('executive.title')} description={t('executive.subtitle')} />

      <div className="kpi-grid mb-6">
        <KPICard label={t('executive.totalApps')} value={kpis.totalApplications} icon={Layers3} featured delay={0} />
        <KPICard label={t('executive.totalProjects')} value={kpis.totalProjects} icon={FolderKanban} tone="info" delay={40} />
        <KPICard label={t('executive.active')} value={kpis.activeProjects} icon={FolderKanban} tone="teal" delay={80} />
        <KPICard label={t('executive.completed')} value={kpis.completedProjects} icon={CheckCircle2} tone="success" delay={120} />
        <KPICard label={t('executive.pending')} value={kpis.pendingProjects} icon={PauseCircle} delay={160} />
        <KPICard label={t('executive.overdueTasks')} value={kpis.overdueTasks} icon={Clock3} tone="danger" delay={200} />
        <KPICard label={t('executive.teamMembers')} value={kpis.totalTeamMembers} icon={Users} tone="info" delay={240} />
        <KPICard
          label={t('executive.progress')}
          value={formatPercent(kpis.overallActualProgress)}
          hint={`${t('executive.planned')} ${formatPercent(kpis.overallPlannedProgress)}`}
          icon={TrendingUp}
          tone="info"
          delay={280}
        />
        <KPICard label={t('executive.appsOperating')} value={kpis.appsOperating} icon={CheckCircle2} tone="success" delay={320} />
        <KPICard
          label={t('executive.appsNeedUpdate')}
          value={kpis.appsRequiringUpdates}
          icon={AlertTriangle}
          tone="warning"
          delay={360}
        />
      </div>

      <Card className="mb-6 animate-fade-up">
        <CardHeader>
          <CardTitle>{t('executive.appsOverview')}</CardTitle>
          <p className="text-xs text-muted">{t('executive.appsOverviewHint')}</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {apps.map((app) => {
              const pm = app.ownerId ? personName(state, app.ownerId, language === 'ar' ? 'ar' : 'en') : null
                              const taskCount = state.wbs.filter(
                                (w) => w.projectId === app.projectId && w.type === 'task',
                              ).length
              return (
                <div
                  key={app.id}
                  className="rounded-xl border border-border/80 bg-bg/40 p-4 transition-shadow hover:border-royal/40 hover:shadow-sm"
                >
                  <Link to={`/apps/${app.id}`} className="block">
                    <div className="mb-3 flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: app.iconColor || '#0F766E' }}
                      >
                        {(language === 'ar' ? app.nameAr : app.name).slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          {language === 'ar' ? app.nameAr : app.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
                          {language === 'ar' ? app.descriptionAr : app.description}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-md bg-surface px-2 py-0.5 text-navy">
                        {t('executive.users')}: {(app.userCount ?? 0).toLocaleString()}
                      </span>
                      <span className="rounded-md bg-surface px-2 py-0.5 text-navy">
                        {t('executive.readiness')}: {app.readiness ?? 0}%
                      </span>
                      {app.publishStatus ? (
                        <span className="rounded-md bg-teal/10 px-2 py-0.5 text-teal">{app.publishStatus}</span>
                      ) : null}
                    </div>
                    <p className="mb-3 text-[11px] text-muted">
                      {t('common.pm')}: {pm ?? t('executive.unassignedPm')} · {t('nav.tasks')}: {taskCount}
                    </p>
                  </Link>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to={`/apps/${app.id}`}
                      className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
                    >
                      {t('executive.openWorkspace')}
                    </Link>
                    {app.url ? (
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-royal hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('executive.openApp')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title={t('executive.statusDist')} description={t('executive.statusDistHint')} delay={60}>
          {statusTotal === 0 ? (
            <EmptyState icon={Gauge} title={t('executive.noChartData')} description={t('executive.noChartDataBody')} />
          ) : (
            <div className="relative h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDataLocalized}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={98}
                    paddingAngle={3}
                    cornerRadius={6}
                    stroke="#fff"
                    strokeWidth={3}
                    animationBegin={100}
                    animationDuration={900}
                  >
                    {statusDataLocalized.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums text-navy">{statusTotal}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted">{t('executive.totalProjects')}</p>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title={t('executive.plannedVsActual')} description={t('executive.plannedVsActualHint')} delay={100}>
          {progressData.length === 0 ? (
            <EmptyState icon={TrendingUp} title={t('executive.noChartData')} description={t('executive.noChartDataBody')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData} barGap={6} barCategoryGap="28%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...xAxisProps} />
                <YAxis {...yAxisProps} unit="%" />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                <Legend iconType="circle" />
                <Bar dataKey="planned" name={t('executive.planned')} fill={chartTheme.planned} radius={[6, 6, 0, 0]} animationDuration={900} />
                <Bar dataKey="actual" name={t('executive.actual')} fill={chartTheme.actual} radius={[6, 6, 0, 0]} animationDuration={1100} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t('executive.deliveryTimeline')} description={t('executive.deliveryTimelineHint')} delay={140}>
          {timeline.length === 0 ? (
            <EmptyState icon={FolderKanban} title={t('executive.noChartData')} description={t('executive.noChartDataBody')} />
          ) : (
            <div className="h-full space-y-2.5 overflow-y-auto pe-1">
              {timeline.slice(0, 8).map((item, i) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/80 bg-gradient-to-r from-bg/80 to-surface p-3 transition-all hover:border-royal/30 hover:shadow-sm animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-navy">{item.code}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-border/70">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.max(4, item.progress)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {formatDate(item.start)} → {formatDate(item.end)} · {item.progress}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title={t('executive.monthlyMilestones')} description={t('executive.monthlyMilestonesHint')} delay={180}>
          {milestoneData.every((m) => m.planned === 0 && m.completed === 0) ? (
            <EmptyState icon={CheckCircle2} title={t('executive.noChartData')} description={t('executive.noChartDataBody')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={milestoneData} barGap={4}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...xAxisProps} />
                <YAxis allowDecimals={false} {...yAxisProps} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" />
                <Bar dataKey="planned" name={t('executive.planned')} fill={chartTheme.muted} radius={[6, 6, 0, 0]} animationDuration={800} />
                <Bar dataKey="completed" name={t('executive.completed')} fill={chartTheme.royal} radius={[6, 6, 0, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t('executive.slaByProject')} description={t('executive.slaByProjectHint')} delay={220}>
          {slaSeries.length === 0 || slaSeries.every((s) => s.sla === 0) ? (
            <EmptyState icon={Gauge} title={t('executive.noChartData')} description={t('executive.noChartDataBody')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slaSeries}>
                <defs>
                  <linearGradient id="slaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1F6B47" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1F6B47" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...xAxisProps} />
                <YAxis domain={[0, 100]} {...yAxisProps} unit="%" />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                <Area
                  type="monotone"
                  dataKey="sla"
                  name="SLA"
                  stroke="#1F6B47"
                  strokeWidth={2.5}
                  fill="url(#slaFill)"
                  dot={{ r: 4, fill: '#1F6B47', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t('executive.riskSeverity')} description={t('executive.riskSeverityHint')} delay={260}>
          {riskTotal === 0 ? (
            <EmptyState icon={AlertTriangle} title={t('executive.noChartData')} description={t('executive.noChartDataBody')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDataLocalized} barCategoryGap="35%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...xAxisProps} />
                <YAxis allowDecimals={false} {...yAxisProps} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name={t('executive.count')} radius={[8, 8, 0, 0]} animationDuration={900}>
                  {riskDataLocalized.map((_, i) => (
                    <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t('executive.pmPerformance')} description={t('executive.pmPerformanceHint')} delay={300}>
          {pmData.length === 0 ? (
            <EmptyState icon={Users} title={t('executive.noChartData')} description={t('executive.noChartDataBody')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pmData} barGap={6}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" />
                <Bar dataKey="progress" name={t('executive.progress')} fill={chartTheme.royal} radius={[6, 6, 0, 0]} animationDuration={900} />
                <Bar dataKey="sla" name="SLA" fill={chartTheme.teal} radius={[6, 6, 0, 0]} animationDuration={1100} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t('executive.budgetUtil')} description={t('executive.budgetUtilHint')} delay={340}>
          {budgetData.every((b) => b.allocated === 0 && b.spent === 0) ? (
            <EmptyState icon={Gauge} title={t('executive.noChartData')} description={t('executive.noChartDataBody')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} barGap={6}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(Number(v))} />} />
                <Legend iconType="circle" />
                <Bar dataKey="allocated" name={t('executive.allocated')} fill={chartTheme.blue} radius={[6, 6, 0, 0]} animationDuration={900} />
                <Bar dataKey="spent" name={t('executive.spent')} fill={chartTheme.warning} radius={[6, 6, 0, 0]} animationDuration={1100} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="animate-fade-up" style={{ animationDelay: '380ms' }}>
          <CardHeader>
            <CardTitle>{t('executive.insights')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasInsightContent ? (
              <EmptyState icon={TrendingUp} title={t('executive.noInsights')} description={t('executive.noInsightsBody')} />
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-up" style={{ animationDelay: '420ms' }}>
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t('executive.activity')}</CardTitle>
            <div className="filter-bar w-full sm:w-auto">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder={t('executive.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allProjects')}</SelectItem>
                  {state.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{t('executive.days7')}</SelectItem>
                  <SelectItem value="30">{t('executive.days30')}</SelectItem>
                  <SelectItem value="90">{t('executive.days90')}</SelectItem>
                  <SelectItem value="365">{t('executive.days365')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <EmptyState icon={Clock3} title={t('executive.noActivity')} description={t('executive.noActivityBody')} />
            ) : (
              <ActivityFeed items={activities} />
            )}
          </CardContent>
        </Card>
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
    info: 'border-primary/20',
    warning: 'border-warning/25',
    danger: 'border-danger/20',
    teal: 'border-teal/20',
  }
  return (
    <div className={`neo-soft border border-transparent p-3.5 transition-transform hover:translate-x-0.5 ${accent[tone]}`}>
      <p className="text-sm font-semibold text-navy">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
    </div>
  )
}
