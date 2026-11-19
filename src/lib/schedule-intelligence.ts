/** Smart schedule progress / status from dates + reported work. */

export type WbsWorkStatus = 'To Do' | 'In Progress' | 'Completed'

export type PhaseBarStatus = 'completed' | 'in_progress' | 'delayed' | 'not_started'

export type ScheduleState = {
  /** Progress used by bars (reported work wins; else calendar). */
  progress: number
  /** Persisted WBS status. */
  status: WbsWorkStatus
  /** Dashboard bar color/state. */
  barStatus: PhaseBarStatus
  /** True when progress came from the calendar, not reported work. */
  fromCalendar: boolean
}

const DAY_MS = 86_400_000

export function startOfDay(isoOrDate: string | Date): number {
  const d =
    typeof isoOrDate === 'string' ? new Date(`${isoOrDate.slice(0, 10)}T00:00:00`) : isoOrDate
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10))
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

/**
 * Resolve progress for a schedule item.
 * - Reported progress &gt; 0 (or 100) always wins.
 * - Otherwise fill from the calendar so past / active windows move the bars.
 */
export function effectiveScheduleProgress(
  start: string,
  end: string,
  reportedProgress: number | null | undefined,
  today = new Date(),
): { progress: number; fromCalendar: boolean } {
  const reported = clampPct(reportedProgress ?? 0)
  if (reported > 0) {
    return { progress: reported, fromCalendar: false }
  }

  const planned = plannedProgressByDate(start, end, today)
  return { progress: planned, fromCalendar: planned > 0 }
}

export function phaseBarStatus(
  progress: number,
  start: string,
  end: string,
  today = new Date(),
): PhaseBarStatus {
  const p = clampPct(progress)
  if (p >= 100) return 'completed'
  const t = startOfDay(today)
  if (end && t > startOfDay(end) && p < 100) return 'delayed'
  if (p <= 0) {
    if (start && t < startOfDay(start)) return 'not_started'
    return 'not_started'
  }
  return 'in_progress'
}

export function inferWbsStatus(
  progress: number,
  start: string,
  end: string,
  today = new Date(),
): WbsWorkStatus {
  const p = clampPct(progress)
  if (p >= 100) return 'Completed'
  const bar = phaseBarStatus(p, start, end, today)
  if (bar === 'not_started') return 'To Do'
  return 'In Progress'
}

/** Full inference for import / dashboard / WBS sync. */
export function inferScheduleState(
  start: string,
  end: string,
  reportedProgress: number | null | undefined,
  today = new Date(),
): ScheduleState {
  const { progress, fromCalendar } = effectiveScheduleProgress(start, end, reportedProgress, today)
  const barStatus = phaseBarStatus(progress, start, end, today)
  // Past end with incomplete reported work stays delayed (In Progress), not Completed.
  const status = inferWbsStatus(progress, start, end, today)
  return { progress, status, barStatus, fromCalendar }
}

/** Milestone status from dates when left as Upcoming / blank. */
export function inferMilestoneStatus(
  baselineDate: string,
  forecastDate: string | undefined,
  current: string | undefined,
  today = new Date(),
): string {
  const status = (current || 'Upcoming').trim() || 'Upcoming'
  if (status === 'Completed' || status === 'Accepted') return status
  if (status === 'Delayed') return status
  const due = forecastDate || baselineDate
  if (!due) return status
  if (startOfDay(today) > startOfDay(due)) return 'Delayed'
  return status === 'Upcoming' ? 'Upcoming' : status
}

/** App / project operational status from plan window when still Planned. */
export function inferDeliveryStatus(
  plannedStart: string,
  plannedEnd: string,
  current: string | undefined,
  today = new Date(),
): string {
  const status = (current || 'Planned').trim() || 'Planned'
  if (status === 'Completed' || status === 'Cancelled' || status === 'On Hold') return status
  if (!plannedStart) return status
  const t = startOfDay(today)
  const s = startOfDay(plannedStart)
  // Past or current start → Active (overdue is shown via delay days / phase bars).
  if (t >= s) return status === 'Planned' ? 'Active' : status
  return status
}

export function daysBetweenDates(a: string | Date, b: string | Date) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS)
}
