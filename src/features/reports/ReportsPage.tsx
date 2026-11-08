import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { getPortfolioKpis } from '@/data/selectors'
import { exportToCsv, formatCurrency, formatPercent } from '@/lib/utils'
import { Download, Printer } from 'lucide-react'

const TEMPLATE_KEYS = [
  'tpl0',
  'tpl1',
  'tpl2',
  'tpl3',
  'tpl4',
  'tpl5',
  'tpl6',
  'tpl7',
  'tpl8',
  'tpl9',
] as const

export function ReportsPage() {
  const { t } = useTranslation()
  const { state, isLoading, isError, refetch } = useDomain()
  const [templateKey, setTemplateKey] = useState<(typeof TEMPLATE_KEYS)[number]>('tpl0')
  const [projectId, setProjectId] = useState('all')
  const [range, setRange] = useState('q4-2026')

  const kpis = state ? getPortfolioKpis(state) : null
  const template = t(`reports.${templateKey}`)

  const preview = useMemo(() => {
    if (!state || !kpis) {
      return {
        template,
        range,
        project: t('common.allProjects'),
        active: 0,
        planned: 0,
        sla: 0,
        progress: 0,
        budget: 0,
        risks: 0,
      }
    }
    const project = state.projects.find((p) => p.id === projectId)
    return {
      template,
      range,
      project: project?.code ?? t('common.allProjects'),
      active: kpis.activeProjects,
      planned: kpis.plannedProjects,
      sla: kpis.slaCompliance,
      progress: kpis.overallActualProgress,
      budget: kpis.spent,
      risks: state.risks.filter((r) => r.status !== 'Closed').length,
    }
  }, [template, range, projectId, kpis, state, t])

  if (isLoading || !state || !kpis) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  const rangeLabel =
    range === 'oct-2026'
      ? t('reports.rangeOct')
      : range === 'nov-2026'
        ? t('reports.rangeNov')
        : range === 'ytd-2026'
          ? t('reports.rangeYtd')
          : t('reports.rangeQ4')

  const exportReport = () => {
    exportToCsv(`awqaf-${templateKey}.csv`, [
      {
        template: preview.template,
        range: rangeLabel,
        project: preview.project,
        activeProjects: preview.active,
        plannedProjects: preview.planned,
        slaCompliance: preview.sla,
        overallProgress: preview.progress,
        spentSAR: preview.budget,
        openRisks: preview.risks,
      },
    ])
  }

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        description={t('reports.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t('reports.printView')}
            </Button>
            <Button onClick={exportReport}>
              <Download className="h-4 w-4" />
              {t('common.exportCsv')}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        <Select value={templateKey} onValueChange={(v) => setTemplateKey(v as (typeof TEMPLATE_KEYS)[number])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`reports.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue />
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
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="oct-2026">{t('reports.rangeOct')}</SelectItem>
            <SelectItem value="nov-2026">{t('reports.rangeNov')}</SelectItem>
            <SelectItem value="q4-2026">{t('reports.rangeQ4')}</SelectItem>
            <SelectItem value="ytd-2026">{t('reports.rangeYtd')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {TEMPLATE_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setTemplateKey(key)}
            className={`rounded-xl border p-4 text-start text-sm transition ${
              templateKey === key ? 'border-royal bg-royal/5 text-navy' : 'border-border bg-surface text-muted hover:bg-bg'
            }`}
          >
            {t(`reports.${key}`)}
          </button>
        ))}
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <CardTitle>
            {template} · {preview.project}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted">
            {t('reports.range')}: {rangeLabel}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label={t('reports.activeProjects')} value={String(preview.active)} />
            <Stat label={t('reports.plannedProjects')} value={String(preview.planned)} />
            <Stat label={t('reports.overallProgress')} value={formatPercent(preview.progress)} />
            <Stat label={t('reports.slaCompliance')} value={formatPercent(preview.sla)} />
            <Stat label={t('reports.spend')} value={formatCurrency(preview.budget)} />
            <Stat label={t('reports.openRisks')} value={String(preview.risks)} />
          </div>
          <p className="leading-relaxed text-muted">{t('reports.demoBody')}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/60 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-navy">{value}</p>
    </div>
  )
}
