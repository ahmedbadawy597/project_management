/** Mirrors frontend src/lib/app-dashboard-metrics.ts for Nest dashboard endpoint. */

import {
  clampPct,
  daysBetweenDates,
  effectiveScheduleProgress,
  phaseBarStatus,
  plannedProgressByDate,
  startOfDay,
  type PhaseBarStatus,
} from './schedule-intelligence'

export type { PhaseBarStatus }
export { phaseBarStatus, plannedProgressByDate }

export type AppLike = {
  id: string
  projectId: string
  plannedStart: string
  plannedEnd: string
  userCount?: number | null
  readiness?: number | null
}

export type WbsLike = {
  id: string
  projectId: string
  appId?: string | null
  code?: string | null
  parentId?: string | null
  name: string
  nameAr: string
  type: string
  start: string
  end: string
  progress: number
  weightPct?: number | null
}

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

function itemEffectiveProgress(item: WbsLike, today: Date): number {
  return effectiveScheduleProgress(item.start, item.end, item.progress, today).progress
}

function resolvePhaseProgress(phase: WbsLike, all: WbsLike[], today: Date): number {
  const kids = all.filter(
    (w) => w.parentId === phase.id && (w.type === 'task' || w.type === 'phase'),
  )
  if (!kids.length) return itemEffectiveProgress(phase, today)
  const avg = kids.reduce((s, k) => s + itemEffectiveProgress(k, today), 0) / kids.length
  const ownReported = clampPct(phase.progress ?? 0)
  if (ownReported > 0) return clampPct(Math.max(ownReported, avg))
  return clampPct(avg)
}

export function computeAppDashboardMetrics(
  app: AppLike,
  wbs: WbsLike[],
  today = new Date(),
): AppDashboardMetrics {
  const appWbs = wbs.filter((w) => w.appId === app.id)
  const phases = appWbs
    .filter((w) => w.type === 'phase')
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start) || (a.code ?? a.id).localeCompare(b.code ?? b.id))

  const phaseRows: AppDashboardPhase[] = phases.map((ph) => {
    const progress = resolvePhaseProgress(ph, appWbs, today)
    return {
      id: ph.id,
      code: ph.code ?? undefined,
      name: ph.name,
      nameAr: ph.nameAr,
      progress,
      weightPct: ph.weightPct ?? undefined,
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
    overallProgress = clampPct(
      appWbs.reduce((s, w) => s + itemEffectiveProgress(w, today), 0) / appWbs.length,
    )
  } else {
    overallProgress = clampPct(app.readiness ?? 0)
  }

  const plannedProgress = plannedProgressByDate(app.plannedStart, app.plannedEnd, today)

  let delayDays = 0
  if (overallProgress < 100 && app.plannedEnd) {
    const t = startOfDay(today)
    const end = startOfDay(app.plannedEnd)
    if (t > end) delayDays = Math.max(delayDays, daysBetweenDates(app.plannedEnd, today))
  }
  for (const ph of phaseRows) {
    if (ph.progress < 100 && ph.end) {
      const t = startOfDay(today)
      const end = startOfDay(ph.end)
      if (t > end) delayDays = Math.max(delayDays, daysBetweenDates(ph.end, today))
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

export type ProjectScheduleProgress = {
  actualProgress: number
  plannedProgress: number
  hasPlan: boolean
}

/** Roll up app plan progress into project actual/planned %. */
export function computeProjectScheduleProgress(
  project: { id: string; plannedStart: string; plannedEnd: string },
  apps: AppLike[],
  wbs: WbsLike[],
  today = new Date(),
): ProjectScheduleProgress {
  const projectApps = apps.filter((a) => a.projectId === project.id)
  const metrics = projectApps.map((app) => computeAppDashboardMetrics(app, wbs, today))
  const withPlan = metrics.filter((m) => m.hasPlan)
  const plannedProgress = plannedProgressByDate(project.plannedStart, project.plannedEnd, today)
  if (!withPlan.length) {
    return { actualProgress: 0, plannedProgress, hasPlan: false }
  }
  const actualProgress = clampPct(
    withPlan.reduce((s, m) => s + m.overallProgress, 0) / withPlan.length,
  )
  return { actualProgress, plannedProgress, hasPlan: true }
}
