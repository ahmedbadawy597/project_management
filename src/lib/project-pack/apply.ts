import type {
  AppMemberRole,
  Milestone,
  Person,
  Project,
  ProjectApp,
  ProjectAppStatus,
  ProjectStatus,
  Risk,
  WbsItem,
} from '@/data/types'
import {
  inferDeliveryStatus,
  inferMilestoneStatus,
  inferScheduleState,
} from '@/lib/schedule-intelligence'
import {
  appIdFromCode,
  milestoneIdFromCodes,
  projectIdFromCode,
  riskIdFromCodes,
  wbsIdFromCodes,
} from './ids'
import type { ImportSummary, ParsedProjectPack } from './types'

export type ApplyPackDeps = {
  people: Person[]
  findProjectByCode: (code: string) => Project | undefined
  findAppByCode: (projectId: string, code: string) => ProjectApp | undefined
  upsertProject: (project: Project, actorId: string, created: boolean) => void
  upsertApp: (app: ProjectApp) => void
  setProjectMembers: (projectId: string, personIds: string[]) => void
  setAppMembers: (appId: string, members: Array<{ personId: string; role: AppMemberRole }>) => void
  upsertWbs: (item: WbsItem, actorId: string) => void
  upsertMilestone: (m: Milestone) => void
  upsertRisk: (r: Risk) => void
}

function personByEmail(people: Person[], email: string | undefined) {
  if (!email) return undefined
  return people.find((p) => p.email.toLowerCase() === email.toLowerCase())
}

export function applyProjectPack(
  pack: ParsedProjectPack,
  actorId: string,
  deps: ApplyPackDeps,
): ImportSummary {
  const existing = deps.findProjectByCode(pack.project.project_code)
  const projectId = existing?.id ?? projectIdFromCode(pack.project.project_code)
  const created = !existing
  const manager = personByEmail(deps.people, pack.project.manager_email)

  const project: Project = {
    id: projectId,
    code: pack.project.project_code,
    name: pack.project.name_en || pack.project.name_ar,
    nameAr: pack.project.name_ar || pack.project.name_en,
    description: pack.project.description_en,
    descriptionAr: pack.project.description_ar,
    managerId: manager?.id ?? existing?.managerId ?? actorId,
    status: inferDeliveryStatus(
      pack.project.planned_start,
      pack.project.planned_end,
      pack.project.status,
    ) as ProjectStatus,
    plannedProgress: existing?.plannedProgress ?? 0,
    actualProgress: existing?.actualProgress ?? 0,
    plannedStart: pack.project.planned_start,
    plannedEnd: pack.project.planned_end,
    forecastEnd: pack.project.planned_end,
    phase: pack.project.phase || existing?.phase || 'Initiation',
    budgetApproved: existing?.budgetApproved ?? 0,
    budgetAllocated: existing?.budgetAllocated ?? 0,
    budgetSpent: existing?.budgetSpent ?? 0,
    slaCompliance: existing?.slaCompliance ?? 100,
    riskLevel: existing?.riskLevel ?? 'Low',
    summary: existing?.summary ?? '',
    summaryAr: existing?.summaryAr ?? '',
    managerUpdate: existing?.managerUpdate ?? '',
    managerUpdateAr: existing?.managerUpdateAr ?? '',
    charter: existing?.charter ?? '',
    charterAr: existing?.charterAr ?? '',
  }
  deps.upsertProject(project, actorId, created)

  const appIdByCode = new Map<string, string>()
  for (const row of pack.apps) {
    const prev = deps.findAppByCode(projectId, row.app_code)
    const id = prev?.id ?? appIdFromCode(row.app_code)
    appIdByCode.set(row.app_code, id)
    const owner = personByEmail(deps.people, row.owner_email)
    const app: ProjectApp = {
      id,
      projectId,
      code: row.app_code,
      name: row.name_en || row.name_ar,
      nameAr: row.name_ar || row.name_en,
      description: row.description_ar,
      descriptionAr: row.description_ar,
      ownerId: owner?.id ?? prev?.ownerId,
      status: inferDeliveryStatus(
        row.planned_start,
        row.planned_end,
        row.status,
      ) as ProjectAppStatus,
      plannedStart: row.planned_start,
      plannedEnd: row.planned_end,
      url: prev?.url ?? '',
      userCount: prev?.userCount ?? 0,
      readiness: prev?.readiness ?? 0,
      iconColor: prev?.iconColor ?? '#0F766E',
      publishStatus: prev?.publishStatus ?? 'Draft',
      featured: prev?.featured ?? false,
      sortOrder: prev?.sortOrder,
    }
    deps.upsertApp(app)
  }

  const projectMemberIds = new Set<string>()
  if (manager) projectMemberIds.add(manager.id)
  const appMemberMap = new Map<string, Array<{ personId: string; role: AppMemberRole }>>()

  for (const t of pack.team) {
    const person = personByEmail(deps.people, t.person_email)
    if (!person) continue
    if (!t.app_code) {
      projectMemberIds.add(person.id)
      continue
    }
    const appId = appIdByCode.get(t.app_code)
    if (!appId) continue
    projectMemberIds.add(person.id)
    const list = appMemberMap.get(appId) ?? []
    if (!list.some((m) => m.personId === person.id)) {
      list.push({ personId: person.id, role: t.role })
    }
    appMemberMap.set(appId, list)
  }

  // Ensure app owners are AppManagers when no team row
  for (const row of pack.apps) {
    const appId = appIdByCode.get(row.app_code)
    if (!appId) continue
    const list = appMemberMap.get(appId) ?? []
    const owner = personByEmail(deps.people, row.owner_email)
    if (owner && !list.some((m) => m.personId === owner.id)) {
      list.unshift({ personId: owner.id, role: 'AppManager' })
    }
    if (list.length) {
      appMemberMap.set(appId, list)
      deps.setAppMembers(appId, list)
    }
  }

  deps.setProjectMembers(projectId, [...projectMemberIds])

  let scheduleItems = 0
  let milestones = 0
  let risks = 0

  for (const plan of pack.plans) {
    const appId = appIdByCode.get(plan.app_code)
    if (!appId) continue

    const schedule = plan.rows.filter((r) => r.section === 'schedule')
    const idByCode = new Map<string, string>()
    for (const row of schedule) {
      idByCode.set(row.item_code, wbsIdFromCodes(projectId, plan.app_code, row.item_code))
    }

    for (const row of schedule) {
      const id = idByCode.get(row.item_code)!
      const parentId = row.parent_code ? idByCode.get(row.parent_code) : undefined
      const assignee = personByEmail(deps.people, row.assignee_email)
      const depsCodes = row.depends_on
        ? row.depends_on.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
        : []
      const start = row.start || pack.project.planned_start
      const end = row.end || pack.project.planned_end
      const reported = Math.min(100, Math.max(0, row.progress || 0))
      const smart = inferScheduleState(start, end, reported)
      const progress =
        smart.fromCalendar && smart.barStatus !== 'completed' ? 0 : smart.progress
      const item: WbsItem = {
        id,
        projectId,
        appId,
        code: row.item_code,
        parentId,
        name: row.name_en || row.name_ar,
        nameAr: row.name_ar || row.name_en,
        type: row.type,
        start,
        end,
        baselineStart: start,
        baselineEnd: end,
        progress,
        weightPct: row.weight_pct,
        dependencies: depsCodes.map((c) => idByCode.get(c) ?? c),
        assigneeId: assignee?.id,
        status: smart.status,
        description: row.deliverable_ar || undefined,
      }
      deps.upsertWbs(item, actorId)
      scheduleItems += 1
    }

    for (const row of plan.rows) {
      if (row.section !== 'milestone') continue
      const owner = personByEmail(deps.people, row.owner_email) ?? manager
      const deliverables = row.deliverables_ar
        ? row.deliverables_ar.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
        : []
      const m: Milestone = {
        id: milestoneIdFromCodes(projectId, plan.app_code, row.item_code),
        projectId,
        appId,
        code: row.item_code,
        name: row.name_en || row.name_ar,
        nameAr: row.name_ar || row.name_en,
        ownerId: owner?.id ?? actorId,
        baselineDate: row.baseline_date || pack.project.planned_end,
        forecastDate: row.forecast_date || row.baseline_date || pack.project.planned_end,
        status: inferMilestoneStatus(
          row.baseline_date || pack.project.planned_end,
          row.forecast_date || row.baseline_date,
          row.status,
        ) as Milestone['status'],
        dependencies: [],
        deliverables,
        deliverablesAr: deliverables,
      }
      deps.upsertMilestone(m)
      milestones += 1
    }

    for (const row of plan.rows) {
      if (row.section !== 'risk') continue
      const owner = personByEmail(deps.people, row.owner_email) ?? manager
      const severity = row.severity
      const score = severity === 'Critical' ? 5 : severity === 'High' ? 4 : severity === 'Medium' ? 3 : 2
      const r: Risk = {
        id: riskIdFromCodes(projectId, plan.app_code, row.item_code),
        projectId,
        appId,
        code: row.item_code,
        title: row.name_en || row.name_ar,
        titleAr: row.name_ar || row.name_en,
        ownerId: owner?.id ?? actorId,
        probability: score as 1 | 2 | 3 | 4 | 5,
        impact: score as 1 | 2 | 3 | 4 | 5,
        severity,
        mitigation: '',
        mitigationAr: '',
        targetDate: row.end || pack.project.planned_end,
        status: row.status,
        type: row.type,
      }
      deps.upsertRisk(r)
      risks += 1
    }
  }

  return {
    projectCode: pack.project.project_code,
    projectId,
    apps: pack.apps.length,
    team: pack.team.length,
    scheduleItems,
    milestones,
    risks,
    created,
  }
}
