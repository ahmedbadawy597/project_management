import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gauge,
  Layers3,
  PauseCircle,
  TrendingUp,
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
  plannedVsActual,
  pmPerformance,
  riskSeverityDistribution,
  statusDistribution,
} from '@/data/selectors'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'
import { KpiSkeletonGrid, PageError } from '@/components/shared/PageStates'

const RISK_COLORS = ['#2F8159', '#1F6B47', '#C4922A', '#C45C4A']

export function ExecutivePage() {
  const { t } = useTranslation()
  const { state, language, isLoading, isError, refetch } = useDomain()
  const [projectFilter, setProjectFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('30')

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
    }
  }, [state])

  const activities = useMemo(() => {
    if (!state) return []
    const cutoff = Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000
    return state.activities
      .filter((a) => (projectFilter === 'all' ? true : a.projectId === projectFilter))
      .filter((a) => new Date(a.at).getTime() >= cutoff || a.at.startsWith('2026-'))
      .slice(0, 8)
  }, [state, projectFilter, dateFilter])

  if (isLoading || !derived || !state) {
    return (
      <div className="page-enter">
        <PageHeader title={t('executive.title')} description={t('executive.subtitle')} />
        <KpiSkeletonGrid />
      </div>
    )
  }

  if (isError) {
    return <PageError message={t('common.loading')} onRetry={() => void refetch()} />
  }

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

  const slaSeries = kpis.active.map((p) => ({
    name: p.code.replace('AWQ-APP-', ''),
    sla: p.slaCompliance,
  }))

  return (
    <div className="page-enter">
      <PageHeader title={t('executive.title')} description={t('executive.subtitle')} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label={t('executive.totalApps')}
          value={kpis.totalApplications}
          icon={Layers3}
          featured
          delay={0}
        />
        <KPICard label={t('executive.active')} value={kpis.activeProjects} icon={FolderKanban} tone="info" delay={40} />
        <KPICard label={t('executive.planned')} value={kpis.plannedProjects} icon={PauseCircle} tone="teal" delay={80} />
        <KPICard label={t('executive.completed')} value={kpis.completedProjects} icon={CheckCircle2} tone="success" delay={120} />
        <KPICard label={t('executive.atRisk')} value={kpis.atRiskProjects} icon={AlertTriangle} tone="warning" delay={160} />
        <KPICard label={t('executive.delayed')} value={kpis.delayedProjects} icon={Clock3} tone="danger" delay={200} />
        <KPICard
          label={t('executive.progress')}
          value={formatPercent(kpis.overallActualProgress)}
          hint={`${t('executive.planned')} ${formatPercent(kpis.overallPlannedProgress)} · ${kpis.scheduleVariance} pp`}
          icon={TrendingUp}
          tone="info"
          trend={{ value: `${kpis.scheduleVariance} pp`, positive: kpis.scheduleVariance >= 0 }}
          delay={240}
        />
        <KPICard label={t('executive.sla')} value={formatPercent(kpis.slaCompliance)} icon={Gauge} tone="success" delay={280} />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title={t('executive.statusDist')} description={t('executive.statusDistHint')} delay={60}>
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
                <p className="text-[11px] uppercase tracking-wide text-muted">{t('executive.totalApps')}</p>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title={t('executive.plannedVsActual')} description={t('executive.plannedVsActualHint')} delay={100}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData} barGap={6} barCategoryGap="28%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} unit="%" />
              <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
              <Legend iconType="circle" />
              <Bar dataKey="planned" name={t('executive.planned')} fill={chartTheme.planned} radius={[6, 6, 0, 0]} animationDuration={900} />
              <Bar dataKey="actual" name={t('executive.actual')} fill={chartTheme.actual} radius={[6, 6, 0, 0]} animationDuration={1100} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('executive.deliveryTimeline')} description={t('executive.deliveryTimelineHint')} delay={140}>
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
        </ChartCard>

        <ChartCard title={t('executive.monthlyMilestones')} description={t('executive.monthlyMilestonesHint')} delay={180}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={milestoneData} barGap={4}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" />
              <Bar dataKey="planned" name={t('executive.planned')} fill={chartTheme.muted} radius={[6, 6, 0, 0]} animationDuration={800} />
              <Bar dataKey="completed" name={t('executive.completed')} fill={chartTheme.royal} radius={[6, 6, 0, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('executive.slaByProject')} description={t('executive.slaByProjectHint')} delay={220}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={slaSeries}>
              <defs>
                <linearGradient id="slaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F6B47" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1F6B47" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis domain={[50, 100]} {...axisProps} unit="%" />
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
        </ChartCard>

        <ChartCard title={t('executive.riskSeverity')} description={t('executive.riskSeverityHint')} delay={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskDataLocalized} barCategoryGap="35%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name={t('executive.count')} radius={[8, 8, 0, 0]} animationDuration={900}>
                {riskDataLocalized.map((_, i) => (
                  <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('executive.pmPerformance')} description={t('executive.pmPerformanceHint')} delay={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pmData} barGap={6}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" />
              <Bar dataKey="progress" name={t('executive.progress')} fill={chartTheme.royal} radius={[6, 6, 0, 0]} animationDuration={900} />
              <Bar dataKey="sla" name="SLA" fill={chartTheme.teal} radius={[6, 6, 0, 0]} animationDuration={1100} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('executive.budgetUtil')} description={t('executive.budgetUtilHint')} delay={340}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetData} barGap={6}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(Number(v))} />} />
              <Legend iconType="circle" />
              <Bar dataKey="allocated" name={t('executive.allocated')} fill={chartTheme.blue} radius={[6, 6, 0, 0]} animationDuration={900} />
              <Bar dataKey="spent" name={t('executive.spent')} fill={chartTheme.warning} radius={[6, 6, 0, 0]} animationDuration={1100} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="animate-fade-up" style={{ animationDelay: '380ms' }}>
          <CardHeader>
            <CardTitle>{t('executive.insights')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Insight
              tone="info"
              title={t('executive.insight1')}
              body={insights.approachingMilestones
                .map((m) => `${language === 'ar' ? m.nameAr : m.name} (${formatDate(m.forecastDate)})`)
                .join(' · ')}
            />
            {insights.scheduleVarianceProject && (
              <Insight
                tone="danger"
                title={t('executive.insight2')}
                body={`${insights.scheduleVarianceProject.code}: ${insights.scheduleVarianceProject.actualProgress}% / ${insights.scheduleVarianceProject.plannedProgress}% (${insights.scheduleVarianceProject.scheduleVariance} pp).`}
              />
            )}
            <Insight
              tone="warning"
              title={t('executive.insight3')}
              body={t('resources.capacityWatchBody')}
            />
            {insights.criticalIssue && (
              <Insight
                tone="danger"
                title={t('executive.insight4')}
                body={language === 'ar' ? insights.criticalIssue.titleAr : insights.criticalIssue.title}
              />
            )}
            <Insight
              tone="teal"
              title={t('executive.insight5')}
              body={insights.readyForInitiation.map((p) => p.code).join(', ')}
            />
          </CardContent>
        </Card>

        <Card className="animate-fade-up" style={{ animationDelay: '420ms' }}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>{t('executive.activity')}</CardTitle>
            <div className="flex gap-2">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[140px]">
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
                <SelectTrigger className="w-[110px]">
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
            <ActivityFeed items={activities} />
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
