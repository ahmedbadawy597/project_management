import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { KPICard } from '@/components/shared/KPICard'
import { RiskPanel } from './RiskPanel'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'

export function RisksPage() {
  const { t } = useTranslation()
  const { state, isLoading, isError, refetch } = useDomain()

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  const risks = state?.risks ?? []
  const openRisks = risks.filter((r) => r.type === 'risk' && r.status !== 'Closed').length
  const critical = risks.filter((r) => r.severity === 'Critical' && r.status !== 'Closed').length
  const openIssues = risks.filter((r) => r.type === 'issue' && r.status !== 'Closed').length
  const overdue = risks.filter((r) => r.overdue).length
  const resolved = risks.filter((r) => r.status === 'Closed').length

  return (
    <div>
      <PageHeader title={t('risks.title')} description={t('risks.subtitle')} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KPICard label={t('risks.openRisks')} value={openRisks} tone="warning" />
        <KPICard label={t('risks.criticalRisks')} value={critical} tone="danger" />
        <KPICard label={t('risks.openIssues')} value={openIssues} tone="info" />
        <KPICard label={t('risks.overdueIssues')} value={overdue} tone="danger" />
        <KPICard label={t('risks.resolved')} value={resolved} tone="success" />
      </div>
      <RiskPanel />
    </div>
  )
}
