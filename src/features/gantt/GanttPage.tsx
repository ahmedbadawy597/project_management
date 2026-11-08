import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProjectGantt } from '@/components/gantt/ProjectGantt'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useProjects } from '@/api/hooks'
import { useUiStore } from '@/data/ui-store'

export function GanttPage() {
  const { t } = useTranslation()
  const projectsQuery = useProjects()
  const language = useUiStore((s) => s.language)
  const [params] = useSearchParams()
  const [projectId, setProjectId] = useState(params.get('project') || 'prj-001')

  if (projectsQuery.isLoading) return <PageLoading label={t('common.loading')} />
  if (projectsQuery.isError) return <PageError onRetry={() => void projectsQuery.refetch()} />

  const projects = projectsQuery.data ?? []

  return (
    <div className="page-enter">
      <PageHeader
        title={t('gantt.title')}
        description={t('gantt.subtitleEasy')}
        actions={
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder={t('gantt.selectProject')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('gantt.allActivePhases')}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code} — {language === 'ar' ? p.nameAr : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <ProjectGantt projectId={projectId === 'all' ? undefined : projectId} />
    </div>
  )
}
