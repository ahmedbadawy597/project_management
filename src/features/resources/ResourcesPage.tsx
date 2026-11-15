import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { KPICard } from '@/components/shared/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDirection } from '@/hooks/useDirection'

export function ResourcesPage() {
  const { t } = useTranslation()
  const { isRtl } = useDirection()
  const { state, language, isLoading, isError, refetch } = useDomain()

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  const people = state?.people ?? []
  const projects = state?.projects ?? []
  const staff = people.filter((p) => p.role !== 'Portfolio Director')
  const allocated = staff.filter((p) => p.allocation > 0).length
  const available = staff.filter((p) => p.availability >= 40).length
  const overallocated = staff.filter((p) => p.allocation > 100)

  const workload = staff.map((p) => ({
    name: language === 'ar' ? p.nameAr.split(' ')[0] : p.name.split(' ')[0],
    allocation: p.allocation,
    availability: p.availability,
  }))

  return (
    <div>
      <PageHeader title={t('resources.title')} description={t('resources.subtitle')} />
      <div className="kpi-grid mb-6">
        <KPICard label={t('resources.totalMembers')} value={staff.length} />
        <KPICard label={t('resources.allocated')} value={allocated} tone="info" />
        <KPICard label={t('resources.available')} value={available} tone="success" />
        <KPICard label={t('resources.overallocated')} value={overallocated.length} tone="danger" />
        <KPICard
          label={t('resources.activeCoverage')}
          value={projects.filter((p) => p.status === 'Active').length}
          tone="teal"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('resources.workload')}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} reversed={isRtl} />
                <YAxis orientation={isRtl ? 'right' : 'left'} />
                <Tooltip />
                <Bar dataKey="allocation" fill="#3159A5" name={t('resources.allocationPct')} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('resources.conflicts')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overallocated.length === 0 ? (
              <p className="text-sm text-muted">{t('resources.noOverallocation')}</p>
            ) : (
              overallocated.map((p) => (
                <div key={p.id} className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm">
                  <p className="font-medium text-navy">{language === 'ar' ? p.nameAr : p.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {p.allocation}% {t('resources.allocatedAcross')}{' '}
                    {p.projectIds.map((id) => projects.find((x) => x.id === id)?.code).join(', ')}
                  </p>
                </div>
              ))
            )}
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm">
              <p className="font-medium text-navy">{t('resources.capacityWatch')}</p>
              <p className="mt-1 text-xs text-muted">{t('resources.capacityWatchBody')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="table-scroll edge-fade-x">
        <table className="w-full min-w-[720px] text-sm md:min-w-[900px]">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-start">{t('common.employee')}</th>
              <th className="px-3 py-2 text-start">{t('common.role')}</th>
              <th className="px-3 py-2 text-start">{t('common.department')}</th>
              <th className="px-3 py-2 text-start">{t('common.project')}</th>
              <th className="px-3 py-2 text-start">{t('common.allocation')}</th>
              <th className="px-3 py-2 text-start">{t('common.availability')}</th>
              <th className="px-3 py-2 text-start">{t('resources.timesheet')}</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-3 font-medium text-navy">{language === 'ar' ? p.nameAr : p.name}</td>
                <td className="px-3 py-3">{p.role}</td>
                <td className="px-3 py-3">{p.department}</td>
                <td className="px-3 py-3 text-xs">
                  {p.projectIds.map((id) => projects.find((x) => x.id === id)?.code).filter(Boolean).join(', ') || '—'}
                </td>
                <td className="min-w-[140px] px-3 py-3">
                  <div className="mb-1 text-xs">{p.allocation}%</div>
                  <Progress
                    value={Math.min(p.allocation, 100)}
                    indicatorClassName={p.allocation > 100 ? 'bg-danger' : undefined}
                  />
                </td>
                <td className="px-3 py-3">{p.availability}%</td>
                <td className="px-3 py-3 text-xs text-muted">
                  {Math.round(p.allocation * 0.4)}
                  {t('common.hours')} {t('common.thisWeek')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
