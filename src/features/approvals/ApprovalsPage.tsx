import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { KPICard } from '@/components/shared/KPICard'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { ApprovalsPanel } from './ApprovalsPanel'
import { useApprovals } from '@/api/hooks'

export function ApprovalsPage() {
  const { t } = useTranslation()
  const approvalsQuery = useApprovals()

  if (approvalsQuery.isLoading) return <PageLoading label={t('common.loading')} />
  if (approvalsQuery.isError) return <PageError onRetry={() => void approvalsQuery.refetch()} />

  const approvals = approvalsQuery.data ?? []
  const pending = approvals.filter((a) => a.status === 'Pending').length
  const approved = approvals.filter((a) => a.status === 'Approved').length
  const rejected = approvals.filter((a) => a.status === 'Rejected').length

  return (
    <div>
      <PageHeader title={t('approvals.title')} description={t('approvals.subtitle')} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label={t('approvals.pending')} value={pending} tone="warning" />
        <KPICard label={t('approvals.approved')} value={approved} tone="success" />
        <KPICard label={t('approvals.rejected')} value={rejected} tone="danger" />
        <KPICard label={t('approvals.avgTurnaround')} value={t('approvals.avgTurnaroundValue')} tone="info" />
      </div>
      <ApprovalsPanel />
    </div>
  )
}
