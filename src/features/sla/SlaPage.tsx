import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { KPICard } from '@/components/shared/KPICard'
import { ProgressComparison } from '@/components/shared/ProgressComparison'
import { ChartCard } from '@/components/shared/ChartCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SlaTable } from './SlaTable'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { getPortfolioKpis } from '@/data/selectors'
import { formatPercent } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useDirection } from '@/hooks/useDirection'

export function SlaPage() {
  const { t } = useTranslation()
  const { isRtl } = useDirection()
  const { state, isLoading, isError, refetch } = useDomain()

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  const kpis = getPortfolioKpis(state)
  const breached = state.slas.filter((s) => s.status === 'Breached').length
  const avgDelay = Math.round(
    kpis.active.reduce((sum, p) => sum + Math.max(0, -p.scheduleVariance), 0) / Math.max(1, kpis.active.length),
  )

  const classification = kpis.active.map((p) => {
    let label = 'On Track'
    if (p.scheduleVariance <= -10 || p.spi < 0.9) label = 'Delayed'
    else if (p.scheduleVariance <= -5) label = 'At Risk'
    else if (p.scheduleVariance >= 5) label = 'Ahead of Schedule'
    return { ...p, label }
  })

  return (
    <div>
      <PageHeader title={t('sla.title')} description={t('sla.subtitle')} />

      <div className="mb-4 rounded-xl border border-royal/20 bg-royal/5 p-4 text-sm text-navy">
        <strong>{t('sla.noticeTitle')}:</strong> {t('sla.noticeBody')}
      </div>

      <div className="kpi-grid-4 mb-6">
        <KPICard label={t('sla.plannedProgress')} value={formatPercent(kpis.overallPlannedProgress)} />
        <KPICard label={t('sla.actualProgress')} value={formatPercent(kpis.overallActualProgress)} tone="teal" />
        <KPICard
          label={t('sla.scheduleVariance')}
          value={`${kpis.scheduleVariance} pp`}
          tone={kpis.scheduleVariance < 0 ? 'danger' : 'success'}
        />
        <KPICard
          label={t('sla.spi')}
          value={(kpis.overallActualProgress / Math.max(1, kpis.overallPlannedProgress)).toFixed(2)}
          tone="info"
        />
        <KPICard label={t('sla.forecastCompletion')} value={t('sla.seeActive')} hint={t('sla.seeActiveHint')} />
        <KPICard label={t('sla.averageDelay')} value={`${avgDelay} pp`} tone="warning" />
        <KPICard label={t('sla.slaCompliance')} value={formatPercent(kpis.slaCompliance)} tone="success" />
        <KPICard label={t('sla.breachedSlas')} value={breached} tone="danger" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('sla.plannedVsActual')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressComparison planned={kpis.overallPlannedProgress} actual={kpis.overallActualProgress} />
          </CardContent>
        </Card>
        <ChartCard title={t('sla.scheduleClassification')}>
          <div className="space-y-2 overflow-y-auto">
            {classification.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <span className="font-medium text-navy">{p.code}</span>
                <StatusBadge status={p.label} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('sla.consumption')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={state.slas.map((s) => ({ name: s.reference, target: s.targetHours, consumed: s.consumedHours }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} reversed={isRtl} />
              <YAxis tick={{ fontSize: 11 }} orientation={isRtl ? 'right' : 'left'} />
              <Tooltip />
              <Bar dataKey="target" fill="#C5CEDB" />
              <Bar dataKey="consumed" fill="#3159A5" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card>
          <CardHeader>
            <CardTitle>{t('sla.escalation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {state.slas
              .filter((s) => s.escalationCount > 0 || s.status === 'Breached')
              .map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-navy">{s.reference}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {s.category} · {t('sla.escalations')}: {s.escalationCount} · {t('sla.warningThreshold')}:{' '}
                    {s.warningThreshold}% · {t('sla.businessCalendar')}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <SlaTable />
    </div>
  )
}
