import { formatDate } from '@/lib/utils'
import type { ActivityItem, Person, Project } from '@/data/types'
import { useUiStore } from '@/data/ui-store'
import { useBootstrap } from '@/api/hooks'
import { personName } from '@/data/selectors'

const typeAccent: Record<string, string> = {
  status: 'bg-primary',
  milestone: 'bg-teal',
  approval: 'bg-warning',
  risk: 'bg-danger',
  schedule: 'bg-navy',
  manager: 'bg-primary-light',
  task: 'bg-success',
  document: 'bg-muted',
}

export function ActivityFeed({
  items,
  people,
  projects,
}: {
  items: ActivityItem[]
  people?: Person[]
  projects?: Project[]
}) {
  const language = useUiStore((s) => s.language)
  const bootstrap = useBootstrap(!people || !projects)
  const resolvedPeople = people ?? bootstrap.data?.people ?? []
  const resolvedProjects = projects ?? bootstrap.data?.projects ?? []
  const nameState = { people: resolvedPeople }

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => {
        const project = resolvedProjects.find((p) => p.id === item.projectId)
        return (
          <li
            key={item.id}
            className="group relative overflow-hidden rounded-2xl bg-bg p-3 shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF] transition-all duration-200 hover:-translate-y-0.5 animate-fade-up"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div
              className={`absolute inset-y-3 start-0 w-0.5 rounded-full ${typeAccent[item.type] ?? 'bg-muted'}`}
            />
            <div className="flex items-start justify-between gap-3 ps-2.5">
              <div>
                <p className="text-sm font-medium text-navy transition-colors group-hover:text-primary">
                  {language === 'ar' ? item.titleAr : item.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {project ? (language === 'ar' ? project.nameAr : project.name) : '—'} ·{' '}
                  {personName(nameState, item.actorId, language)}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-muted tabular-nums">
                {formatDate(item.at, 'dd MMM HH:mm')}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
