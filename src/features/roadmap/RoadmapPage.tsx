import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useProjects } from '@/api/hooks'
import { useUiStore } from '@/data/ui-store'
import { cn, formatDate, formatPercent } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/data/types'

const RANGE_START = new Date('2026-01-01').getTime()
const RANGE_END = new Date('2028-04-01').getTime()
const RANGE_SPAN = RANGE_END - RANGE_START

const QUARTERS = [
  { label: 'Q1 2026', at: '2026-01-01' },
  { label: 'Q2 2026', at: '2026-04-01' },
  { label: 'Q3 2026', at: '2026-07-01' },
  { label: 'Q4 2026', at: '2026-10-01' },
  { label: 'Q1 2027', at: '2027-01-01' },
  { label: 'Q2 2027', at: '2027-04-01' },
  { label: 'Q3 2027', at: '2027-07-01' },
  { label: 'Q4 2027', at: '2027-10-01' },
  { label: 'Q1 2028', at: '2028-01-01' },
]

const FILTERS: Array<'All' | ProjectStatus> = ['All', 'Active', 'Planned', 'Completed', 'On Hold']

function pct(date: string | number) {
  const t = typeof date === 'number' ? date : new Date(date).getTime()
  return Math.min(100, Math.max(0, ((t - RANGE_START) / RANGE_SPAN) * 100))
}

function barTone(status: ProjectStatus) {
  if (status === 'Active') return 'bg-primary'
  if (status === 'Planned') return 'bg-primary/35'
  if (status === 'Completed') return 'bg-success'
  return 'bg-muted'
}

function RoadmapRow({
  project,
  language,
  todayPct,
}: {
  project: Project
  language: 'en' | 'ar'
  todayPct: number
}) {
  const startPct = pct(project.plannedStart)
  const endPct = pct(project.forecastEnd)
  const plannedEndPct = pct(project.plannedEnd)
  const width = Math.max(2.5, endPct - startPct)
  const slipped = new Date(project.forecastEnd).getTime() > new Date(project.plannedEnd).getTime() + 86400000
  const name = language === 'ar' ? project.nameAr : project.name

  return (
    <div className="group grid grid-cols-1 border-t border-border lg:grid-cols-[minmax(220px,280px)_1fr]">
      <div className="flex flex-col justify-center gap-1.5 px-4 py-3 lg:border-e lg:border-border">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/projects/${project.id}`}
            className="text-sm font-semibold text-navy hover:text-primary"
          >
            {project.code}
          </Link>
          <StatusBadge status={project.status} />
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted">{name}</p>
        <p className="text-[11px] tabular-nums text-muted">
          {formatDate(project.plannedStart, 'MMM yyyy')} – {formatDate(project.forecastEnd, 'MMM yyyy')}
          {slipped ? (
            <span className="ms-2 text-warning">
              {language === 'ar' ? 'انحراف عن الخطة' : 'Past plan'}
            </span>
          ) : null}
        </p>
      </div>

      <div className="relative min-h-[64px] overflow-hidden px-2 py-3">
        {/* quarter guides */}
        {QUARTERS.map((q) => (
          <div
            key={q.at}
            className="pointer-events-none absolute inset-y-0 w-px bg-border/70"
            style={{ left: `${pct(q.at)}%` }}
          />
        ))}
        {/* today */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-danger/70"
          style={{ left: `${todayPct}%` }}
        />
        {/* planned end tick when slipped */}
        {slipped && (
          <div
            className="pointer-events-none absolute top-3 bottom-3 z-10 w-px border-e border-dashed border-warning"
            style={{ left: `${plannedEndPct}%` }}
            title={`Plan end ${formatDate(project.plannedEnd)}`}
          />
        )}

        <Link
          to={`/projects/${project.id}`}
          className={cn(
            'absolute top-1/2 z-20 flex h-8 -translate-y-1/2 items-center overflow-hidden rounded-md text-white shadow-none transition',
            'ring-1 ring-black/5 group-hover:ring-primary/40',
            barTone(project.status),
          )}
          style={{ left: `${startPct}%`, width: `${width}%` }}
          title={`${formatDate(project.plannedStart)} → ${formatDate(project.forecastEnd)} · ${formatPercent(project.actualProgress)}`}
        >
          <div
            className="absolute inset-y-0 start-0 bg-white/25"
            style={{ width: `${Math.min(100, Math.max(0, project.actualProgress))}%` }}
          />
          <span className="relative truncate px-2 text-[11px] font-medium tabular-nums">
            {formatPercent(project.actualProgress)}
          </span>
        </Link>
      </div>
    </div>
  )
}

export function RoadmapPage() {
  const { t } = useTranslation()
  const projectsQuery = useProjects()
  const language = useUiStore((s) => s.language)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')

  const todayPct = useMemo(() => pct(Date.now()), [])

  const projects = projectsQuery.data ?? []
  const sorted = useMemo(() => {
    const rows =
      filter === 'All' ? projects : projects.filter((p) => p.status === filter)
    return [...rows].sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  }, [projects, filter])

  const counts = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'Active').length,
      planned: projects.filter((p) => p.status === 'Planned').length,
      completed: projects.filter((p) => p.status === 'Completed').length,
    }
  }, [projects])

  if (projectsQuery.isLoading) return <PageLoading label={t('common.loading')} />
  if (projectsQuery.isError) return <PageError onRetry={() => void projectsQuery.refetch()} />

  return (
    <div className="page-enter">
      <PageHeader title={t('roadmap.title')} description={t('roadmap.subtitle')} />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <p className="text-muted">
            <span className="font-semibold tabular-nums text-navy">{counts.total}</span> {t('common.all')}
          </p>
          <p className="text-muted">
            <span className="font-semibold tabular-nums text-navy">{counts.active}</span> {t('common.active')}
          </p>
          <p className="text-muted">
            <span className="font-semibold tabular-nums text-navy">{counts.planned}</span> {t('common.planned')}
          </p>
          <p className="text-muted">
            <span className="font-semibold tabular-nums text-navy">{counts.completed}</span>{' '}
            {t('common.completed')}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition',
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-bg text-muted ring-1 ring-border hover:text-navy',
              )}
            >
              {f === 'All'
                ? t('common.all')
                : f === 'Active'
                  ? t('common.active')
                  : f === 'Planned'
                    ? t('common.planned')
                    : f === 'Completed'
                      ? t('common.completed')
                      : f}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> {t('common.active')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/35" /> {t('common.planned')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success" /> {t('common.completed')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-danger/70" /> {t('common.today')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px border-e border-dashed border-warning" />{' '}
          {language === 'ar' ? 'نهاية الخطة' : 'Plan end'}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-1 border-b border-border bg-bg/80 lg:grid-cols-[minmax(220px,280px)_1fr]">
          <div className="hidden items-center px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted lg:flex lg:border-e lg:border-border">
            {language === 'ar' ? 'المشروع' : 'Project'}
          </div>
          <div className="relative h-9 overflow-hidden">
            {QUARTERS.map((q) => (
              <span
                key={q.at}
                className="absolute top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted"
                style={{ left: `${pct(q.at)}%`, transform: 'translate(-0%, -50%)' }}
              >
                <span className="ms-1">{q.label}</span>
              </span>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">{t('common.noResults')}</p>
        ) : (
          sorted.map((p) => (
            <RoadmapRow key={p.id} project={p} language={language} todayPct={todayPct} />
          ))
        )}
      </div>
    </div>
  )
}
