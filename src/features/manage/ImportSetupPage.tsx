import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Clock3, SkipForward, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDomain } from '@/api/useDomain'
import { useUpsertTask } from '@/api/hooks'
import { useImportSetupStore } from '@/data/import-setup-store'
import type { TaskStatus, WbsItem } from '@/data/types'
import {
  computeAppDashboardMetrics,
  type PhaseBarStatus,
} from '@/lib/app-dashboard-metrics'
import { inferScheduleState } from '@/lib/schedule-intelligence'
import { cn, formatPercent } from '@/lib/utils'

const EDIT_STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Completed', 'Blocked']

type DraftRow = {
  id: string
  start: string
  end: string
  progress: number
  status: TaskStatus
}

function barTone(status: PhaseBarStatus) {
  switch (status) {
    case 'completed':
      return 'bg-success'
    case 'in_progress':
      return 'bg-warning'
    case 'delayed':
      return 'bg-danger'
    default:
      return 'bg-border'
  }
}

function toDraft(item: WbsItem): DraftRow {
  return {
    id: item.id,
    start: item.start,
    end: item.end,
    progress: item.progress ?? 0,
    status: (item.status as TaskStatus) || 'To Do',
  }
}

export function ImportSetupPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isAr = i18n.language.startsWith('ar')
  const { state, isLoading, isError, refetch } = useDomain()
  const upsert = useUpsertTask()
  const clearPending = useImportSetupStore((s) => s.clearPending)
  const markPending = useImportSetupStore((s) => s.markPending)

  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({})
  const [appFilter, setAppFilter] = useState<string>('all')
  const [saving, setSaving] = useState(false)

  const project = state?.projects.find((p) => p.id === projectId)
  const apps = useMemo(
    () => (state?.apps ?? []).filter((a) => a.projectId === projectId),
    [state?.apps, projectId],
  )
  const wbs = useMemo(
    () => (state?.wbs ?? []).filter((w) => w.projectId === projectId),
    [state?.wbs, projectId],
  )

  useEffect(() => {
    if (!wbs.length) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const item of wbs) {
        if (!next[item.id]) next[item.id] = toDraft(item)
      }
      return next
    })
  }, [wbs])

  useEffect(() => {
    if (project) {
      markPending({
        projectId: project.id,
        projectCode: project.code,
        importedAt: new Date().toISOString(),
      })
    }
  }, [project, markPending])

  const scheduleItems = useMemo(() => {
    const items = wbs
      .filter((w) => w.type === 'phase' || w.type === 'task')
      .slice()
      .sort((a, b) => {
        const appCmp = (a.appId ?? '').localeCompare(b.appId ?? '')
        if (appCmp) return appCmp
        if (a.type !== b.type) return a.type === 'phase' ? -1 : 1
        return a.start.localeCompare(b.start) || a.name.localeCompare(b.name)
      })
    if (appFilter === 'all') return items
    return items.filter((w) => w.appId === appFilter)
  }, [wbs, appFilter])

  const previewMetrics = useMemo(() => {
    if (!apps.length) return null
    const mergedWbs = wbs.map((w) => {
      const d = drafts[w.id]
      if (!d) return w
      return { ...w, start: d.start, end: d.end, progress: d.progress, status: d.status }
    })
    return apps.map((app) => ({
      app,
      metrics: computeAppDashboardMetrics(app, mergedWbs),
    }))
  }, [apps, wbs, drafts])

  const updateDraft = (id: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) => {
      const base = prev[id] ?? toDraft(wbs.find((w) => w.id === id)!)
      const next = { ...base, ...patch }
      if (patch.progress != null) {
        if (patch.progress >= 100) next.status = 'Completed'
        else if (patch.progress > 0 && next.status === 'To Do') next.status = 'In Progress'
        else if (patch.progress <= 0 && next.status === 'Completed') next.status = 'To Do'
      }
      if (patch.status === 'Completed') next.progress = 100
      if (patch.start != null || patch.end != null) {
        const smart = inferScheduleState(next.start, next.end, next.progress > 0 ? next.progress : 0)
        if (next.progress <= 0) {
          next.status = smart.status
        }
      }
      return { ...prev, [id]: next }
    })
  }

  const persistDrafts = async () => {
    const changed = scheduleItems.filter((item) => {
      const d = drafts[item.id]
      if (!d) return false
      return (
        d.start !== item.start ||
        d.end !== item.end ||
        d.progress !== (item.progress ?? 0) ||
        d.status !== item.status
      )
    })
    for (const item of changed) {
      const d = drafts[item.id]!
      await upsert.mutateAsync({
        ...item,
        start: d.start,
        end: d.end,
        baselineStart: item.baselineStart || d.start,
        baselineEnd: item.baselineEnd || d.end,
        progress: d.progress,
        status: d.status,
      })
    }
    return changed.length
  }

  const finish = async (mode: 'save' | 'skip' | 'later') => {
    if (!project) return
    setSaving(true)
    try {
      if (mode === 'save') {
        const n = await persistDrafts()
        clearPending(project.id)
        toast.success(t('importSetup.saved', { count: n }))
        navigate(`/manage/projects/${project.id}`)
        return
      }
      if (mode === 'skip') {
        clearPending(project.id)
        toast.success(t('importSetup.skipped'))
        navigate(`/manage/projects/${project.id}`)
        return
      }
      // Keep pending first so Manage always shows "Continue setup".
      markPending({
        projectId: project.id,
        projectCode: project.code,
        importedAt: new Date().toISOString(),
      })
      try {
        await persistDrafts()
      } catch {
        // Edits can be finished later — do not block resume entry.
        toast.message(t('importSetup.laterPartial'))
      }
      toast.message(t('importSetup.laterToast'))
      navigate('/manage')
    } catch {
      toast.error(t('importSetup.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  if (!project) {
    return (
      <div className="page-enter space-y-4">
        <PageHeader title={t('importSetup.title')} description={t('importSetup.missing')} />
        <Button asChild variant="outline">
          <Link to="/manage">{t('manage.back')}</Link>
        </Button>
      </div>
    )
  }

  const title = isAr ? project.nameAr || project.name : project.name

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title={t('importSetup.title')}
        description={t('importSetup.subtitle', { code: project.code, name: title })}
        actions={
          <Button variant="outline" asChild className="min-h-11">
            <Link to="/manage">
              <ArrowLeft className="me-1.5 h-4 w-4" />
              {t('manage.back')}
            </Link>
          </Button>
        }
      />

      <section className="neo space-y-3 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-teal/10 p-2 text-teal">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-navy">{t('importSetup.smartTitle')}</h2>
            <p className="mt-1 text-xs text-muted">{t('importSetup.smartBody')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted">
          {(
            [
              ['completed', t('appDashboard.statusCompleted')],
              ['in_progress', t('appDashboard.statusInProgress')],
              ['delayed', t('appDashboard.statusDelayed')],
              ['not_started', t('appDashboard.statusNotStarted')],
            ] as const
          ).map(([key, label]) => (
            <span key={key} className="inline-flex items-center gap-1.5 rounded-lg bg-bg/80 px-2 py-1">
              <span className={cn('h-2 w-2 rounded-full', barTone(key))} />
              {label}
            </span>
          ))}
        </div>
      </section>

      {previewMetrics && previewMetrics.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {previewMetrics.map(({ app, metrics }) => {
            const appName = isAr ? app.nameAr || app.name : app.name
            return (
              <div key={app.id} className="neo p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-navy">{appName}</p>
                  <span className="text-xs tabular-nums text-muted">{app.code}</span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-navy">
                  {formatPercent(metrics.overallProgress)}
                </p>
                <Progress
                  value={metrics.overallProgress}
                  className="mt-2 h-2.5"
                  indicatorClassName={
                    metrics.delayDays > 0 ? 'bg-danger' : metrics.overallProgress >= 100 ? 'bg-success' : 'bg-warning'
                  }
                />
                <p className="mt-2 text-[11px] text-muted">
                  {t('importSetup.appHint', {
                    phases: metrics.phases.length,
                    delay: metrics.delayDays,
                  })}
                </p>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={appFilter} onValueChange={setAppFilter}>
          <SelectTrigger className="min-h-11 w-full max-w-xs">
            <SelectValue placeholder={t('importSetup.filterApp')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('importSetup.allApps')}</SelectItem>
            {apps.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {isAr ? a.nameAr || a.name : a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted">{t('importSetup.rowsHint', { count: scheduleItems.length })}</p>
      </div>

      <div className="neo overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-bg/80 text-xs text-muted">
              <tr>
                <th className="px-3 py-3 text-start font-semibold">{t('importSetup.colItem')}</th>
                <th className="px-3 py-3 text-start font-semibold">{t('importSetup.colType')}</th>
                <th className="px-3 py-3 text-start font-semibold">{t('common.start')}</th>
                <th className="px-3 py-3 text-start font-semibold">{t('importSetup.colEnd')}</th>
                <th className="px-3 py-3 text-start font-semibold">{t('common.progress')}</th>
                <th className="px-3 py-3 text-start font-semibold">{t('common.status')}</th>
                <th className="px-3 py-3 text-start font-semibold">{t('importSetup.colSmart')}</th>
              </tr>
            </thead>
            <tbody>
              {scheduleItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted">
                    {t('importSetup.noRows')}
                  </td>
                </tr>
              ) : (
                scheduleItems.map((item) => {
                  const d = drafts[item.id] ?? toDraft(item)
                  const smart = inferScheduleState(d.start, d.end, d.progress)
                  const name = isAr ? item.nameAr || item.name : item.name
                  const app = apps.find((a) => a.id === item.appId)
                  return (
                    <tr key={item.id} className="border-t border-border/60 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium text-navy">{name}</p>
                        <p className="text-[11px] text-muted">
                          {item.code ?? item.id}
                          {app ? ` · ${app.code}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3 capitalize text-muted">{item.type}</td>
                      <td className="px-3 py-3">
                        <Input
                          type="date"
                          className="h-10 min-w-[9.5rem]"
                          value={d.start.slice(0, 10)}
                          onChange={(e) => updateDraft(item.id, { start: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="date"
                          className="h-10 min-w-[9.5rem]"
                          value={d.end.slice(0, 10)}
                          onChange={(e) => updateDraft(item.id, { end: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-10 w-20"
                          value={d.progress}
                          onChange={(e) =>
                            updateDraft(item.id, { progress: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Select
                          value={d.status}
                          onValueChange={(v) => updateDraft(item.id, { status: v as TaskStatus })}
                        >
                          <SelectTrigger className="h-10 min-w-[8.5rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EDIT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {t(`status.${s}`, { defaultValue: s })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                          <span className={cn('h-2.5 w-2.5 rounded-full', barTone(smart.barStatus))} />
                          {t(`appDashboard.status${smart.barStatus === 'in_progress' ? 'InProgress' : smart.barStatus === 'not_started' ? 'NotStarted' : smart.barStatus === 'delayed' ? 'Delayed' : 'Completed'}`)}
                          <span className="tabular-nums">· {formatPercent(smart.progress)}</span>
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="px-1 text-xs text-muted">{t('importSetup.footerHint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={saving}
            onClick={() => void finish('later')}
          >
            <Clock3 className="me-1.5 h-4 w-4" />
            {t('importSetup.later')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={saving}
            onClick={() => void finish('skip')}
          >
            <SkipForward className="me-1.5 h-4 w-4" />
            {t('importSetup.skip')}
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={saving}
            onClick={() => void finish('save')}
          >
            <CheckCircle2 className="me-1.5 h-4 w-4" />
            {t('importSetup.saveFinish')}
          </Button>
        </div>
      </div>
    </div>
  )
}
