import type {
  ActivityItem,
  Approval,
  BudgetTransaction,
  DocumentItem,
  HealthStatus,
  Milestone,
  NotificationItem,
  Person,
  Project,
  ProjectApp,
  Risk,
  RiskLevel,
  SlaRecord,
  WbsItem,
} from './types'
import { DEMO_TODAY } from './seed'

/** Domain snapshot used by KPI helpers (API bootstrap shape). */
export interface DomainState {
  projects: Project[]
  people: Person[]
  wbs: WbsItem[]
  milestones: Milestone[]
  slas: SlaRecord[]
  risks: Risk[]
  transactions: BudgetTransaction[]
  approvals: Approval[]
  documents: DocumentItem[]
  activities: ActivityItem[]
  notifications: NotificationItem[]
  apps?: ProjectApp[]
}

export function scheduleVariance(project: Project) {
  return project.actualProgress - project.plannedProgress
}

export function spi(project: Project) {
  if (project.plannedProgress <= 0) return project.status === 'Planned' ? 1 : 0
  return Number((project.actualProgress / project.plannedProgress).toFixed(2))
}

export function budgetUtilization(project: Project) {
  if (project.budgetAllocated <= 0) return 0
  return Number(((project.budgetSpent / project.budgetAllocated) * 100).toFixed(1))
}

export function deriveHealth(project: Project, openCriticalRisks = 0): HealthStatus {
  if (project.status === 'Completed') return 'Completed'
  if (project.status === 'Planned') return 'Not Started'
  if (project.status === 'On Hold') return 'At Risk'

  const variance = scheduleVariance(project)
  const projectSpi = spi(project)

  if (variance <= -10 || projectSpi < 0.9 || openCriticalRisks > 0) return 'Delayed'
  if (
    variance <= -5 ||
    project.riskLevel === 'High' ||
    project.riskLevel === 'Critical'
  ) {
    return 'At Risk'
  }
  return 'On Track'
}

export function enrichProject(state: DomainState, project: Project) {
  const openCritical = state.risks.filter(
    (r) =>
      r.projectId === project.id &&
      r.status !== 'Closed' &&
      (r.severity === 'Critical' || r.type === 'issue'),
  ).length
  const health = deriveHealth(project, openCritical)
  const manager = state.people.find((p) => p.id === project.managerId)
  return {
    ...project,
    scheduleVariance: scheduleVariance(project),
    spi: spi(project),
    budgetUtilization: budgetUtilization(project),
    health,
    managerName: manager?.name ?? '—',
    managerNameAr: manager?.nameAr ?? '—',
    openRisks: state.risks.filter((r) => r.projectId === project.id && r.status !== 'Closed')
      .length,
    pendingApprovals: state.approvals.filter(
      (a) => a.projectId === project.id && a.status === 'Pending',
    ).length,
  }
}

export type EnrichedProject = ReturnType<typeof enrichProject>

export function getPortfolioKpis(state: DomainState) {
  const enriched = state.projects.map((p) => enrichProject(state, p))
  const active = enriched.filter((p) => p.status === 'Active')
  const planned = enriched.filter((p) => p.status === 'Planned')
  const completed = enriched.filter((p) => p.status === 'Completed')
  const atRisk = active.filter((p) => p.health === 'At Risk')
  const delayed = active.filter((p) => p.health === 'Delayed')
  const overallActual =
    active.length === 0
      ? 0
      : Math.round(active.reduce((s, p) => s + p.actualProgress, 0) / active.length)
  const overallPlanned =
    active.length === 0
      ? 0
      : Math.round(active.reduce((s, p) => s + p.plannedProgress, 0) / active.length)
  const slaCompliance =
    active.length === 0
      ? 100
      : Math.round(active.reduce((s, p) => s + p.slaCompliance, 0) / active.length)

  const totalBudget = state.projects.reduce((s, p) => s + p.budgetApproved, 0)
  const allocated = state.projects.reduce((s, p) => s + p.budgetAllocated, 0)
  const spent = state.projects.reduce((s, p) => s + p.budgetSpent, 0)

  return {
    totalApplications: state.projects.length,
    activeProjects: active.length,
    plannedProjects: planned.length,
    completedProjects: completed.length,
    atRiskProjects: atRisk.length,
    delayedProjects: delayed.length,
    overallActualProgress: overallActual,
    overallPlannedProgress: overallPlanned,
    scheduleVariance: overallActual - overallPlanned,
    slaCompliance,
    totalBudget,
    allocated,
    spent,
    remaining: allocated - spent,
    budgetVariance: allocated - spent,
    enriched,
    active,
    planned,
  }
}

export function statusDistribution(state: DomainState) {
  const k = getPortfolioKpis(state)
  const onTrack = k.active.filter((p) => p.health === 'On Track').length
  return [
    { name: 'On Track', value: onTrack, color: '#1F6B47' },
    { name: 'At Risk', value: k.atRiskProjects, color: '#C4922A' },
    { name: 'Delayed', value: k.delayedProjects, color: '#C45C4A' },
    { name: 'Planned', value: k.plannedProjects, color: '#A8C4B4' },
    { name: 'Completed', value: k.completedProjects, color: '#2F8159' },
  ]
}

export function plannedVsActual(state: DomainState) {
  return getPortfolioKpis(state).active.map((p) => ({
    name: p.code.replace('AWQ-APP-', ''),
    fullName: p.name,
    planned: p.plannedProgress,
    actual: p.actualProgress,
  }))
}

export function riskSeverityDistribution(state: DomainState) {
  const levels: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical']
  return levels.map((level) => ({
    name: level,
    value: state.risks.filter((r) => r.severity === level && r.status !== 'Closed').length,
  }))
}

export function pmPerformance(state: DomainState) {
  const active = state.projects.filter((p) => p.status === 'Active')
  const byPm = new Map<string, { name: string; projects: number; avgProgress: number; avgSla: number }>()
  for (const p of active) {
    const person = state.people.find((x) => x.id === p.managerId)
    const key = p.managerId
    const prev = byPm.get(key) ?? {
      name: person?.name ?? key,
      projects: 0,
      avgProgress: 0,
      avgSla: 0,
    }
    prev.projects += 1
    prev.avgProgress += p.actualProgress
    prev.avgSla += p.slaCompliance
    byPm.set(key, prev)
  }
  return [...byPm.values()].map((x) => ({
    name: x.name.split(' ')[0],
    progress: Math.round(x.avgProgress / x.projects),
    sla: Math.round(x.avgSla / x.projects),
  }))
}

export function budgetByProject(state: DomainState) {
  return state.projects
    .filter((p) => p.status === 'Active' || p.budgetSpent > 0)
    .map((p) => ({
      name: p.code.replace('AWQ-APP-', ''),
      approved: p.budgetApproved,
      allocated: p.budgetAllocated,
      spent: p.budgetSpent,
    }))
}

export function monthlyMilestoneCompletion(state: DomainState) {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'] as const
  const map: Record<(typeof months)[number], number> = {
    Jun: 0,
    Jul: 0,
    Aug: 0,
    Sep: 0,
    Oct: 0,
    Nov: 0,
  }
  const plannedByMonth: Record<(typeof months)[number], number> = {
    Jun: 0,
    Jul: 0,
    Aug: 0,
    Sep: 0,
    Oct: 0,
    Nov: 0,
  }

  for (const m of state.milestones) {
    if (m.actualDate) {
      const month = m.actualDate.slice(5, 7)
      if (month === '06') map.Jun++
      if (month === '07') map.Jul++
      if (month === '08') map.Aug++
      if (month === '09') map.Sep++
      if (month === '10') map.Oct++
      if (month === '11') map.Nov++
    }
    const forecastMonth = m.forecastDate.slice(5, 7)
    if (forecastMonth === '06') plannedByMonth.Jun++
    if (forecastMonth === '07') plannedByMonth.Jul++
    if (forecastMonth === '08') plannedByMonth.Aug++
    if (forecastMonth === '09') plannedByMonth.Sep++
    if (forecastMonth === '10') plannedByMonth.Oct++
    if (forecastMonth === '11') plannedByMonth.Nov++
  }

  return months.map((m) => ({
    month: m,
    completed: map[m],
    planned: plannedByMonth[m],
  }))
}

export function deliveryTimeline(state: DomainState) {
  return state.projects.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    start: p.plannedStart,
    end: p.forecastEnd,
    status: p.status,
    progress: p.actualProgress,
  }))
}

export function executiveInsights(state: DomainState) {
  const upcomingMilestones = state.milestones
    .filter((m) => m.status === 'Upcoming' || m.status === 'Delayed')
    .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate))
    .slice(0, 3)
  const delayedActive = getPortfolioKpis(state).active.filter((p) => p.health === 'Delayed')
  const criticalIssue = state.risks.find(
    (r) => r.type === 'issue' && r.severity === 'Critical' && r.status !== 'Closed',
  )
  const readyInitiation = state.projects.filter(
    (p) => p.status === 'Planned' && p.plannedProgress === 0,
  ).slice(0, 5)
  const overallocated = state.people.filter((p) => p.allocation > 100)

  return {
    approachingMilestones: upcomingMilestones,
    scheduleVarianceProject: delayedActive[0] ?? null,
    resourcePlanningNeeded: overallocated.length,
    criticalIssue,
    readyForInitiation: readyInitiation,
    today: DEMO_TODAY,
  }
}

export function personName(state: Pick<DomainState, 'people'>, id: string, lang: 'en' | 'ar' = 'en') {
  const p = state.people.find((x) => x.id === id)
  if (!p) return '—'
  return lang === 'ar' ? p.nameAr : p.name
}
