import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { personName, type DomainState } from '@/data/selectors'
import type { Risk } from '@/data/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function RiskPanel({ projectId }: { projectId?: string }) {
  const { t } = useTranslation()
  const { state, language, isLoading, isError, refetch } = useDomain()

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  const risks = state.risks.filter((r) => (projectId ? r.projectId === projectId : true) && r.type === 'risk')
  const issues = state.risks.filter((r) => (projectId ? r.projectId === projectId : true) && r.type === 'issue')

  const heat = Array.from({ length: 5 }, (_, impact) =>
    Array.from({ length: 5 }, (_, prob) => {
      const p = prob + 1
      const i = 5 - impact
      return risks.filter((r) => r.probability === p && r.impact === i).length
    }),
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">{t('risks.heatmap')}</h3>
        <div className="inline-grid grid-cols-6 gap-1 text-xs">
          <div />
          {[1, 2, 3, 4, 5].map((p) => (
            <div key={p} className="p-1 text-center text-muted">
              P{p}
            </div>
          ))}
          {heat.map((row, ri) => (
            <Fragment key={`row-${ri}`}>
              <div className="flex items-center text-muted">I{5 - ri}</div>
              {row.map((count, ci) => {
                const score = (ci + 1) * (5 - ri)
                const bg =
                  score >= 16 ? 'bg-danger/80 text-white' : score >= 10 ? 'bg-warning/70' : score >= 6 ? 'bg-royal/30' : 'bg-bg'
                return (
                  <div key={`${ri}-${ci}`} className={cn('flex h-10 w-10 items-center justify-center rounded-md', bg)}>
                    {count || ''}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <Register title={t('risks.riskRegister')} rows={risks} language={language} state={state} />
      <Register title={t('risks.issueRegister')} rows={issues} language={language} state={state} />
    </div>
  )
}

function Register({
  title,
  rows,
  language,
  state,
}: {
  title: string
  rows: Risk[]
  language: 'en' | 'ar'
  state: DomainState
}) {
  const { t } = useTranslation()
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">{title}</h3>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-start">{t('common.title')}</th>
              <th className="px-3 py-2 text-start">{t('common.project')}</th>
              <th className="px-3 py-2 text-start">{t('common.owner')}</th>
              <th className="px-3 py-2 text-start">P</th>
              <th className="px-3 py-2 text-start">I</th>
              <th className="px-3 py-2 text-start">{t('common.severity')}</th>
              <th className="px-3 py-2 text-start">{t('common.target')}</th>
              <th className="px-3 py-2 text-start">{t('common.status')}</th>
              <th className="px-3 py-2 text-start">{t('common.mitigation')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-navy">{language === 'ar' ? r.titleAr : r.title}</td>
                <td className="px-3 py-2">{state.projects.find((p) => p.id === r.projectId)?.code}</td>
                <td className="px-3 py-2">{personName(state, r.ownerId, language)}</td>
                <td className="px-3 py-2">{r.probability}</td>
                <td className="px-3 py-2">{r.impact}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.severity} />
                </td>
                <td className="px-3 py-2">{formatDate(r.targetDate)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                  {r.overdue ? <span className="ms-1 text-[10px] text-danger">{t('common.overdue')}</span> : null}
                </td>
                <td className="px-3 py-2 text-xs text-muted">{language === 'ar' ? r.mitigationAr : r.mitigation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
