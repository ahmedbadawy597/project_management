import type { ProjectApp, WbsItem } from '@/data/types'

export type PhaseBarStatus = 'completed' | 'in_progress' | 'delayed' | 'not_started'

export type AppDashboardPhase = {
  id: string
  code?: string
  name: string
  nameAr: string
  progress: number
  weightPct?: number
  status: PhaseBarStatus
  start: string
  end: string
}

export type AppDashboardMetrics = {
  appId: string
  projectId: string
  overallProgress: number
  plannedProgress: number
  delayDays: number
  userCount: number
  plannedStart: string
  plannedEnd: string
  phases: AppDashboardPhase[]
  hasPlan: boolean
}

const DAY_MS = 86_400_000

function startOfDay(isoOrDate: string | Date): number {
  const d = typeof isoOrDate === 'string' ? new Date(`${isoOrDate.slice(0, 10)}T00:00:00`) : isoOrDate
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10))
}

function daysBetween(a: number, b: number) {
  return Math.round((b - a) / DAY_MS)
}

/** Expected progress by calendar between start and end (0–100). */
export function plannedProgressByDate(start: string, end: string, today = new Date()): number {
  if (!start || !end) return 0
  const s = startOfDay(start)
  const e = startOfDay(end)
  const t = startOfDay(today)
  if (e <= s) return t >= e ? 100 : 0
  if (t <= s) return 0
  if (t >= e) return 100
  return clampPct(((t - s) / (e - s)) * 100)
}

export function phaseBarStatus(progress: number, start: string, end: string, today = new Date()): PhaseBarStatus {
  const p = clampPct(progress)
  if (p >= 100) return 'completed'
  const t = startOfDay(today)
  if (end && t > startOfDay(end) && p < 100) return 'delayed'
  if (p <= 0 && start && t < startOfDay(start)) return 'not_started'
  if (p <= 0 && (!start || t < startOfDay(start))) return 'not_started'
  if (p <= 0) return 'not_started'
  return 'in_progress'
}

function childrenOf(all: WbsItem[], parentId: string) {
  return all.filter((w) => w.parentId === parentId)
}

/** Phase progress: use own progress if &gt; 0 or no children; else average of child tasks. */
export function resolvePhaseProgress(phase: WbsItem, all: WbsItem[]): number {
  const kids = childrenOf(all, phase.id).filter((w) => w.type === 'task' || w.type === 'phase')
  if (!kids.length) return clampPct(phase.progress ?? 0)
  if ((phase.progress ?? 0) > 0 && kids.every((k) => (k.progress ?? 0) === 0)) {
    return clampPct(phase.progress)
  }
  const avg = kids.reduce((s, k) => s + (k.progress ?? 0), 0) / kids.length
  // Prefer explicit phase progress when higher / set
  if ((phase.progress ?? 0) > 0) return clampPct(Math.max(phase.progress, avg))
  return clampPct(avg)
}

export function computeAppDashboardMetrics(
  app: ProjectApp,
  wbs: WbsItem[],
  today = new Date(),
): AppDashboardMetrics {
  const appWbs = wbs.filter((w) => w.appId === app.id)
  const phases = appWbs
    .filter((w) => w.type === 'phase')
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start) || (a.code ?? a.id).localeCompare(b.code ?? b.id))

  const phaseRows: AppDashboardPhase[] = phases.map((ph) => {
    const progress = resolvePhaseProgress(ph, appWbs)
    return {
      id: ph.id,
      code: ph.code,
      name: ph.name,
      nameAr: ph.nameAr,
      progress,
      weightPct: ph.weightPct,
      status: phaseBarStatus(progress, ph.start, ph.end, today),
      start: ph.start,
      end: ph.end,
    }
  })

  let overallProgress = 0
  if (phaseRows.length) {
    const withWeight = phaseRows.filter((p) => p.weightPct != null && Number(p.weightPct) > 0)
    if (withWeight.length) {
      const totalW = withWeight.reduce((s, p) => s + Number(p.weightPct), 0)
      overallProgress = clampPct(
        withWeight.reduce((s, p) => s + (p.progress * Number(p.weightPct)) / totalW, 0),
      )
    } else {
      overallProgress = clampPct(phaseRows.reduce((s, p) => s + p.progress, 0) / phaseRows.length)
    }
  } else if (appWbs.length) {
    overallProgress = clampPct(appWbs.reduce((s, w) => s + (w.progress ?? 0), 0) / appWbs.length)
  } else {
    // Fall back to stored readiness when no plan yet
    overallProgress = clampPct(app.readiness ?? 0)
  }

  const plannedProgress = plannedProgressByDate(app.plannedStart, app.plannedEnd, today)

  let delayDays = 0
  if (overallProgress < 100 && app.plannedEnd) {
    const end = startOfDay(app.plannedEnd)
    const t = startOfDay(today)
    if (t > end) delayDays = Math.max(delayDays, daysBetween(end, t))
  }
  for (const ph of phaseRows) {
    if (ph.progress < 100 && ph.end) {
      const end = startOfDay(ph.end)
      const t = startOfDay(today)
      if (t > end) delayDays = Math.max(delayDays, daysBetween(end, t))
    }
  }

  return {
    appId: app.id,
    projectId: app.projectId,
    overallProgress,
    plannedProgress,
    delayDays,
    userCount: app.userCount ?? 0,
    plannedStart: app.plannedStart,
    plannedEnd: app.plannedEnd,
    phases: phaseRows,
    hasPlan: phaseRows.length > 0 || appWbs.some((w) => w.type === 'task'),
  }
}
