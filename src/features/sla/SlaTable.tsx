import { useTranslation } from 'react-i18next'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { personName } from '@/data/selectors'
import { formatPercent } from '@/lib/utils'

export function SlaTable({ projectId }: { projectId?: string }) {
  const { t } = useTranslation()
  const { state, language, isLoading, isError, refetch } = useDomain()

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  const rows = state.slas.filter((s) => (projectId ? s.projectId === projectId : true))
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-bg text-xs text-muted">
          <tr>
            <th className="px-3 py-2 text-start">{t('sla.ref')}</th>
            <th className="px-3 py-2 text-start">{t('common.project')}</th>
            <th className="px-3 py-2 text-start">{t('common.category')}</th>
            <th className="px-3 py-2 text-start">{t('common.manager')}</th>
            <th className="px-3 py-2 text-start">{t('common.target')}</th>
            <th className="px-3 py-2 text-start">{t('sla.consumed')}</th>
            <th className="px-3 py-2 text-start">{t('sla.remaining')}</th>
            <th className="px-3 py-2 text-start">{t('sla.compliance')}</th>
            <th className="px-3 py-2 text-start">{t('common.status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const remaining = Math.max(0, s.targetHours - s.consumedHours)
            const pct = Math.min(100, (s.consumedHours / s.targetHours) * 100)
            const project = state.projects.find((p) => p.id === s.projectId)
            return (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-3 font-medium text-navy">{s.reference}</td>
                <td className="px-3 py-3">{project?.code}</td>
                <td className="px-3 py-3">{s.category}</td>
                <td className="px-3 py-3">{personName(state, s.managerId, language)}</td>
                <td className="px-3 py-3">
                  {s.targetHours}
                  {t('common.hours')}
                </td>
                <td className="px-3 py-3">
                  {s.consumedHours}
                  {t('common.hours')}
                </td>
                <td className="px-3 py-3">
                  <div className="min-w-[120px]">
                    <div className="mb-1 text-xs">
                      {remaining.toFixed(1)}
                      {t('common.hours')}
                    </div>
                    <Progress
                      value={pct}
                      indicatorClassName={
                        s.status === 'Breached' ? 'bg-danger' : s.status === 'Warning' ? 'bg-warning' : 'bg-teal'
                      }
                    />
                  </div>
                </td>
                <td className="px-3 py-3">{formatPercent(s.compliance)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={s.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
