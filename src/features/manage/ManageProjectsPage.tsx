import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Settings2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useDomain } from '@/api/useDomain'
import { enrichProject } from '@/data/selectors'

export function ManageProjectsPage() {
  const { t } = useTranslation()
  const { state, language, isLoading, isError, refetch } = useDomain()

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  const rows = state.projects.map((p) => enrichProject(state, p))

  return (
    <div>
      <PageHeader
        title={t('manage.title')}
        description={t('manage.subtitle')}
        actions={
          <Button asChild>
            <Link to="/manage/projects/new">
              <Plus className="me-1.5 h-4 w-4" />
              {t('manage.newProject')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">{t('manage.code')}</th>
                  <th className="px-5 py-3 font-medium">{t('manage.project')}</th>
                  <th className="px-5 py-3 font-medium">{t('manage.manager')}</th>
                  <th className="px-5 py-3 font-medium">{t('manage.apps')}</th>
                  <th className="px-5 py-3 font-medium">{t('manage.status')}</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const appCount = (state.apps ?? []).filter((a) => a.projectId === row.id).length
                  return (
                    <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-surface/60">
                      <td className="px-5 py-3 font-medium text-royal">{row.code}</td>
                      <td className="px-5 py-3 text-navy">
                        {language === 'ar' ? row.nameAr : row.name}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {language === 'ar' ? row.managerNameAr : row.managerName}
                      </td>
                      <td className="px-5 py-3 text-muted">{appCount}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-3 text-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/manage/projects/${row.id}`}>
                            <Settings2 className="me-1.5 h-3.5 w-3.5" />
                            {t('common.edit')}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
