import type { ProjectApp, WbsItem } from '@/data/types'
import {
  clampPct,
  daysBetweenDates,
  effectiveScheduleProgress,
  phaseBarStatus,
  plannedProgressByDate,
  startOfDay,
  type PhaseBarStatus,
} from '@/lib/schedule-intelligence'

export type { PhaseBarStatus }
export { phaseBarStatus, plannedProgressByDate }

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

function childrenOf(all: WbsItem[], parentId: string) {
  return all.filter((w) => w.parentId === parentId)
}

function itemEffectiveProgress(item: WbsItem, today: Date): number {
  return effectiveScheduleProgress(item.start, item.end, item.progress, today).progress
}

/** Phase progress: roll up children (with smart calendar fill); else own effective %. */
export function resolvePhaseProgress(phase: WbsItem, all: WbsItem[], today = new Date()): number {
  const kids = childrenOf(all, phase.id).filter((w) => w.type === 'task' || w.type === 'phase')
  if (!kids.length) return itemEffectiveProgress(phase, today)

  const avg = kids.reduce((s, k) => s + itemEffectiveProgress(k, today), 0) / kids.length
  const ownReported = clampPct(phase.progress ?? 0)
  // Explicit phase progress still wins when higher than child average.
  if (ownReported > 0) return clampPct(Math.max(ownReported, avg))
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
    const progress = resolvePhaseProgress(ph, appWbs, today)
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
