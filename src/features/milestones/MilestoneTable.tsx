import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { personName } from '@/data/selectors'
import { formatDate } from '@/lib/utils'
import type { MilestoneStatus } from '@/data/types'

export function MilestoneTable({ projectId }: { projectId?: string }) {
  const { t } = useTranslation()
  const { state, language, isLoading, isError, refetch } = useDomain()

  const statusLabel = (status: MilestoneStatus) => t(`milestones.status${status}`)

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  const rows = state.milestones.filter((m) => (projectId ? m.projectId === projectId : true))

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-[4px_4px_12px_#D9D3BF20]">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="bg-bg text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.milestone')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.project')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.owner')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.baseline')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.forecast')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.actual')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.status')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.dependencies')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('milestones.deliverables')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const project = state.projects.find((p) => p.id === m.projectId)
            const deliverables = language === 'ar' ? m.deliverablesAr : m.deliverables
            return (
              <tr key={m.id} className="border-t border-border/60 hover:bg-bg/50">
                <td className="px-4 py-3 font-medium text-navy">
                  {language === 'ar' ? m.nameAr : m.name}
                </td>
                <td className="px-4 py-3 text-royal">{project?.code}</td>
                <td className="px-4 py-3">{personName(state, m.ownerId, language)}</td>
                <td className="px-4 py-3 tabular-nums">{formatDate(m.baselineDate)}</td>
                <td className="px-4 py-3 tabular-nums">{formatDate(m.forecastDate)}</td>
                <td className="px-4 py-3 tabular-nums">{formatDate(m.actualDate)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} label={statusLabel(m.status)} />
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {m.dependencies.join(language === 'ar' ? '، ' : ', ') || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {deliverables.join(language === 'ar' ? '، ' : ', ')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
