import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Diamond } from 'lucide-react'
import { useBootstrap } from '@/api/hooks'
import { useUiStore } from '@/data/ui-store'
import type { WbsItem } from '@/data/types'
import { PageLoading } from '@/components/shared/PageStates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Progress } from '@/components/ui/progress'
import { cn, formatDate, formatPercent } from '@/lib/utils'
import { personName } from '@/data/selectors'

type Zoom = 'week' | 'month'

const DAY_MS = 86_400_000

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function addDays(ts: number, days: number) {
  return ts + days * DAY_MS
}

function daysBetween(a: number, b: number) {
  return Math.round((b - a) / DAY_MS)
}

function barColor(item: WbsItem) {
  const slipped =
    new Date(item.end).getTime() > new Date(item.baselineEnd).getTime() && item.progress < 100
  if (item.critical) return 'bg-danger'
  if (item.progress >= 100) return 'bg-success'
  if (slipped) return 'bg-warning'
  if (item.type === 'phase') return 'bg-primary'
  return 'bg-primary-light'
}

export function ProjectGantt({
  projectId,
  className,
}: {
  projectId?: string
  className?: string
}) {
  const { t } = useTranslation()
  const bootstrap = useBootstrap()
  const language = useUiStore((s) => s.language)
  const state = bootstrap.data
  const scrollerRef = useRef<HTMLDivElement>(null)

  const [zoom, setZoom] = useState<Zoom>('week')
  const [showBaseline, setShowBaseline] = useState(true)
  const [query, setQuery] = useState('')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<WbsItem | null>(null)

  const pxPerDay = zoom === 'week' ? 18 : 6

  const items = useMemo(() => {
    if (!state) return []
    let list = state.wbs.filter((w) => (projectId ? w.projectId === projectId : true))
    if (!projectId) {
      list = list.filter(
        (w) =>
          w.type === 'phase' &&
          state.projects.find((p) => p.id === w.projectId)?.status === 'Active',
      )
    }
    return list
  }, [state, projectId])

  const range = useMemo(() => {
    if (!items.length) {
      const today = startOfDay(new Date())
      return { start: addDays(today, -14), end: addDays(today, 90) }
    }
    let min = Infinity
    let max = -Infinity
    for (const i of items) {
      min = Math.min(min, new Date(i.start).getTime(), new Date(i.baselineStart).getTime())
      max = Math.max(max, new Date(i.end).getTime(), new Date(i.baselineEnd).getTime())
    }
    const start = addDays(startOfDay(new Date(min)), -7)
    const end = addDays(startOfDay(new Date(max)), 14)
    return { start, end }
  }, [items])

  const timelineWidth = Math.max(1, daysBetween(range.start, range.end)) * pxPerDay
  const todayX = ((startOfDay(new Date()) - range.start) / DAY_MS) * pxPerDay

  const headers = useMemo(() => {
    const marks: { label: string; x: number; width: number }[] = []
    if (zoom === 'week') {
      let cursor = range.start
      // align to Monday-ish
      const d = new Date(cursor)
      const dow = d.getDay()
      cursor = addDays(cursor, dow === 0 ? -6 : 1 - dow)
      while (cursor < range.end) {
        const next = addDays(cursor, 7)
        const x = ((cursor - range.start) / DAY_MS) * pxPerDay
        const width = ((Math.min(next, range.end) - Math.max(cursor, range.start)) / DAY_MS) * pxPerDay
        if (width > 0) {
          marks.push({
            label: formatDate(new Date(cursor).toISOString(), 'dd MMM'),
            x: Math.max(0, x),
            width,
          })
        }
        cursor = next
      }
    } else {
      const d = new Date(range.start)
      d.setDate(1)
      let cursor = startOfDay(d)
      while (cursor < range.end) {
        const nextDate = new Date(cursor)
        nextDate.setMonth(nextDate.getMonth() + 1)
        const next = startOfDay(nextDate)
        const x = ((cursor - range.start) / DAY_MS) * pxPerDay
        const width = ((Math.min(next, range.end) - Math.max(cursor, range.start)) / DAY_MS) * pxPerDay
        if (width > 0) {
          marks.push({
            label: formatDate(new Date(cursor).toISOString(), 'MMM yyyy'),
            x: Math.max(0, x),
            width,
          })
        }
        cursor = next
      }
    }
    return marks
  }, [range, zoom, pxPerDay])

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const childrenOf = new Map<string, WbsItem[]>()
    for (const item of items) {
      if (!item.parentId) continue
      const list = childrenOf.get(item.parentId) ?? []
      list.push(item)
      childrenOf.set(item.parentId, list)
    }
    for (const [, list] of childrenOf) list.sort((a, b) => a.start.localeCompare(b.start))

    const roots = items
      .filter((i) => !i.parentId)
      .sort((a, b) => a.start.localeCompare(b.start))

    const matchesFilter = (item: WbsItem) => {
      if (criticalOnly && !item.critical) {
        // keep ancestors of critical children
        const hasCriticalDesc = (id: string): boolean =>
          (childrenOf.get(id) ?? []).some((c) => c.critical || hasCriticalDesc(c.id))
        if (!hasCriticalDesc(item.id)) return false
      }
      if (!q) return true
      const hay = `${item.name} ${item.nameAr}`.toLowerCase()
      if (hay.includes(q)) return true
      const hasMatchingDesc = (id: string): boolean =>
        (childrenOf.get(id) ?? []).some(
          (c) => `${c.name} ${c.nameAr}`.toLowerCase().includes(q) || hasMatchingDesc(c.id),
        )
      return hasMatchingDesc(item.id)
    }

    const rows: Array<{ item: WbsItem; depth: number }> = []
    const walk = (item: WbsItem, depth: number) => {
      if (!matchesFilter(item)) return
      rows.push({ item, depth })
      if (collapsed[item.id]) return
      for (const child of childrenOf.get(item.id) ?? []) walk(child, depth + 1)
    }
    for (const root of roots) walk(root, 0)
    return rows
  }, [items, query, criticalOnly, collapsed])

  const summary = useMemo(() => {
    const tasks = items.filter((i) => i.type === 'task')
    const slipped = items.filter(
      (i) => new Date(i.end).getTime() > new Date(i.baselineEnd).getTime() && i.progress < 100,
    ).length
    const critical = items.filter((i) => i.critical).length
    const avg =
      tasks.length === 0 ? 0 : Math.round(tasks.reduce((s, i) => s + i.progress, 0) / tasks.length)
    return { tasks: tasks.length, slipped, critical, avg }
  }, [items])

  const scrollToToday = () => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollLeft = Math.max(0, todayX - el.clientWidth / 3)
  }

  const togglePhase = (id: string) => {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  }

  const expandAll = () => setCollapsed({})
  const collapseAll = () => {
    const next: Record<string, boolean> = {}
    for (const i of items) {
      if (i.type === 'phase' || items.some((c) => c.parentId === i.id)) next[i.id] = true
    }
    setCollapsed(next)
  }

  if (bootstrap.isLoading || !state) return <PageLoading />

  const xFor = (iso: string) => ((startOfDay(new Date(iso)) - range.start) / DAY_MS) * pxPerDay
  const wFor = (start: string, end: string) =>
    Math.max(pxPerDay, ((startOfDay(new Date(end)) - startOfDay(new Date(start))) / DAY_MS + 1) * pxPerDay)

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-surface', className)}>
      {/* Summary + controls */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          <span>
            <strong className="tabular-nums text-navy">{summary.tasks}</strong> {t('gantt.task')}
          </span>
          <span>
            <strong className="tabular-nums text-navy">{formatPercent(summary.avg)}</strong>{' '}
            {t('gantt.avgProgress')}
          </span>
          {summary.slipped > 0 && (
            <span className="text-warning">
              <strong className="tabular-nums">{summary.slipped}</strong> {t('gantt.slip')}
            </span>
          )}
          {summary.critical > 0 && (
            <span className="text-danger">
              <strong className="tabular-nums">{summary.critical}</strong> {t('gantt.critical')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 w-full max-w-xs"
            placeholder={t('gantt.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="inline-flex rounded-md border border-border p-0.5">
            <button
              type="button"
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium',
                zoom === 'week' ? 'bg-primary text-white' : 'text-muted hover:text-navy',
              )}
              onClick={() => setZoom('week')}
            >
              {t('gantt.week')}
            </button>
            <button
              type="button"
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium',
                zoom === 'month' ? 'bg-primary text-white' : 'text-muted hover:text-navy',
              )}
              onClick={() => setZoom('month')}
            >
              {t('gantt.month')}
            </button>
          </div>
          <Button size="sm" variant={showBaseline ? 'default' : 'outline'} onClick={() => setShowBaseline((v) => !v)}>
            {showBaseline ? t('gantt.baselineOn') : t('gantt.baselineOff')}
          </Button>
          <Button
            size="sm"
            variant={criticalOnly ? 'default' : 'outline'}
            onClick={() => setCriticalOnly((v) => !v)}
          >
            {t('gantt.criticalOnly')}
          </Button>
          <Button size="sm" variant="outline" onClick={scrollToToday}>
            {t('common.today')}
          </Button>
          <Button size="sm" variant="ghost" onClick={expandAll}>
            {t('gantt.expandAll')}
          </Button>
          <Button size="sm" variant="ghost" onClick={collapseAll}>
            {t('gantt.collapseAll')}
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-muted">
          <Legend className="bg-primary" label={t('gantt.phase')} />
          <Legend className="bg-primary-light" label={t('gantt.task')} />
          <Legend className="bg-success" label={t('gantt.done')} />
          <Legend className="bg-warning" label={t('gantt.slip')} />
          <Legend className="bg-danger" label={t('gantt.critical')} />
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-px bg-danger" /> {t('common.today')}
          </span>
          {showBaseline && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-sm bg-navy/25" /> {t('gantt.baseline')}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex min-h-[420px]">
        {/* Task list */}
        <div className="w-[min(320px,42vw)] shrink-0 border-e border-border">
          <div className="flex h-10 items-center border-b border-border bg-bg px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('gantt.workItem')}
          </div>
          <div className="divide-y divide-border">
            {visibleRows.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted">{t('common.noResults')}</p>
            )}
            {visibleRows.map(({ item, depth }) => {
              const hasChildren = items.some((c) => c.parentId === item.id)
              const name = language === 'ar' ? item.nameAr : item.name
              const projectCode = !projectId
                ? state.projects.find((p) => p.id === item.projectId)?.code
                : null
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex h-11 w-full items-center gap-1 px-2 text-start hover:bg-bg/80"
                >
                  <span style={{ width: depth * 14 }} className="shrink-0" />
                  {hasChildren ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded p-0.5 text-muted hover:bg-border/40 hover:text-navy"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePhase(item.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          togglePhase(item.id)
                        }
                      }}
                    >
                      {collapsed[item.id] ? (
                        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  ) : (
                    <span className="w-4" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-navy">
                      {projectCode ? `${projectCode} · ` : ''}
                      {name}
                    </p>
                    <p className="truncate text-[10px] text-muted">
                      {item.type} · {formatPercent(item.progress)}
                      {item.critical ? ` · ${t('gantt.critical')}` : ''}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Timeline */}
        <div ref={scrollerRef} className="min-w-0 flex-1 overflow-x-auto">
          <div style={{ width: timelineWidth }} className="relative">
            <div className="sticky top-0 z-20 flex h-10 border-b border-border bg-bg">
              {headers.map((h, i) => (
                <div
                  key={`${h.label}-${i}`}
                  className="absolute top-0 flex h-10 items-center border-e border-border/60 px-1.5 text-[10px] font-medium tabular-nums text-muted"
                  style={{ left: h.x, width: h.width }}
                >
                  {h.label}
                </div>
              ))}
            </div>

            <div className="relative">
              {/* vertical week/month guides */}
              {headers.map((h, i) => (
                <div
                  key={`g-${i}`}
                  className="pointer-events-none absolute inset-y-0 border-s border-border/40"
                  style={{ left: h.x }}
                />
              ))}
              {/* today */}
              {todayX >= 0 && todayX <= timelineWidth && (
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-px bg-danger"
                  style={{ left: todayX }}
                />
              )}

              {visibleRows.map(({ item }) => {
                const left = xFor(item.start)
                const width = wFor(item.start, item.end)
                const blLeft = xFor(item.baselineStart)
                const blWidth = wFor(item.baselineStart, item.baselineEnd)
                const isMilestone = item.type === 'milestone'

                return (
                  <div key={item.id} className="relative h-11 border-b border-border/70">
                    {showBaseline && !isMilestone && (
                      <div
                        className="absolute top-[28px] h-1.5 rounded-sm bg-navy/20"
                        style={{ left: blLeft, width: blWidth }}
                      />
                    )}
                    {isMilestone ? (
                      <button
                        type="button"
                        className="absolute top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 text-navy"
                        style={{ left: left }}
                        onClick={() => setSelected(item)}
                        title={language === 'ar' ? item.nameAr : item.name}
                      >
                        <Diamond
                          className={cn('h-4 w-4 fill-current', item.critical ? 'text-danger' : 'text-navy')}
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          'absolute top-2 z-[5] flex h-6 items-center overflow-hidden rounded text-white',
                          barColor(item),
                          item.type === 'phase' ? 'h-7' : 'h-6',
                        )}
                        style={{ left, width }}
                        onClick={() => setSelected(item)}
                        title={`${formatDate(item.start)} → ${formatDate(item.end)}`}
                      >
                        <span
                          className="absolute inset-y-0 start-0 bg-white/25"
                          style={{ width: `${Math.min(100, item.progress)}%` }}
                        />
                        {width > 56 && (
                          <span className="relative truncate px-2 text-[10px] font-medium tabular-nums">
                            {formatPercent(item.progress)}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selected ? (language === 'ar' ? selected.nameAr : selected.name) : ''}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 overflow-y-auto p-5 text-sm">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selected.status} />
                <StatusBadge status={selected.type} />
                {selected.critical ? <StatusBadge status="Critical" /> : null}
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-muted">{t('gantt.progress')}</span>
                  <span className="font-semibold tabular-nums text-navy">
                    {formatPercent(selected.progress)}
                  </span>
                </div>
                <Progress value={selected.progress} className="h-2" indicatorClassName="bg-primary" />
              </div>
              <div className="rounded-lg border border-border bg-bg/40 p-3">
                <Meta label={t('gantt.start')} value={formatDate(selected.start)} />
                <Meta label={t('gantt.finish')} value={formatDate(selected.end)} />
                <Meta label={t('gantt.baselineStart')} value={formatDate(selected.baselineStart)} />
                <Meta label={t('gantt.baselineFinish')} value={formatDate(selected.baselineEnd)} />
                <Meta
                  label={t('gantt.assignee')}
                  value={selected.assigneeId ? personName(state, selected.assigneeId, language) : '—'}
                />
                <Meta
                  label={t('gantt.dependencies')}
                  value={
                    selected.dependencies.length
                      ? selected.dependencies
                          .map((id) => {
                            const dep = items.find((i) => i.id === id)
                            return dep ? (language === 'ar' ? dep.nameAr : dep.name) : id
                          })
                          .join(', ')
                      : '—'
                  }
                />
              </div>
              {selected.description ? (
                <p className="rounded-lg border border-border p-3 text-xs leading-relaxed text-muted">
                  {selected.description}
                </p>
              ) : null}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-sm', className)} />
      {label}
    </span>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/70 py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="max-w-[60%] text-end font-medium text-navy">{value}</span>
    </div>
  )
}
