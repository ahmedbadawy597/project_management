import { BadRequestException, Injectable } from '@nestjs/common'
import { computeAppDashboardMetrics } from '../common/app-dashboard-metrics'
import { pushActivity } from '../common/activity.util'
import { AccessService } from '../common/access.service'
import { AppMembersService } from '../apps/app-members.service'
import { MembersService } from '../projects/members.service'
import { PrismaService } from '../prisma/prisma.service'
import {
  appIdFromCode,
  milestoneIdFromCodes,
  projectIdFromCode,
  riskIdFromCodes,
  wbsIdFromCodes,
} from './project-pack.ids'
import type { ImportSummary, ParsedProjectPack } from './project-pack.types'
import { isBlockingIssue, validateProjectPack } from './project-pack.validate'

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
    private readonly appMembers: AppMembersService,
    private readonly access: AccessService,
  ) {}

  async importProjectPack(pack: ParsedProjectPack, actorId: string) {
    if (!pack?.project) {
      throw new BadRequestException({ message: 'Invalid pack payload', ok: false })
    }

    const people = await this.prisma.person.findMany()
    const issues = validateProjectPack(pack, people)
    const blocking = issues.filter(isBlockingIssue)
    if (blocking.length) {
      throw new BadRequestException({ ok: false, issues: blocking })
    }

    const summary = await this.applyPack(pack, actorId, people)
    return {
      ok: true as const,
      summary,
      warnings: issues.filter((i) => !isBlockingIssue(i)),
    }
  }

  private async applyPack(
    pack: ParsedProjectPack,
    actorId: string,
    people: Array<{ id: string; email: string }>,
  ): Promise<ImportSummary> {
    const byEmail = (email?: string) =>
      email ? people.find((p) => p.email.toLowerCase() === email.toLowerCase()) : undefined

    const existing = await this.prisma.project.findFirst({
      where: { code: { equals: pack.project.project_code, mode: 'insensitive' } },
    })
    const projectId = existing?.id ?? projectIdFromCode(pack.project.project_code)
    const created = !existing
    const manager = byEmail(pack.project.manager_email)
    const managerId = manager?.id ?? existing?.managerId ?? actorId

    const projectData = {
      code: pack.project.project_code,
      name: pack.project.name_en || pack.project.name_ar,
      nameAr: pack.project.name_ar || pack.project.name_en,
      description: pack.project.description_en || '',
      descriptionAr: pack.project.description_ar || '',
      managerId,
      status: pack.project.status,
      plannedStart: pack.project.planned_start,
      plannedEnd: pack.project.planned_end,
      forecastEnd: pack.project.planned_end,
      phase: pack.project.phase || existing?.phase || 'Initiation',
    }

    if (existing) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: projectData,
      })
    } else {
      await this.prisma.project.create({
        data: {
          id: projectId,
          ...projectData,
          plannedProgress: 0,
          actualProgress: 0,
          budgetApproved: 0,
          budgetAllocated: 0,
          budgetSpent: 0,
          slaCompliance: 100,
          riskLevel: 'Low',
          summary: '',
          summaryAr: '',
          managerUpdate: '',
          managerUpdateAr: '',
          charter: '',
          charterAr: '',
        },
      })
      await pushActivity(this.prisma, {
        projectId,
        type: 'status',
        title: `Project created: ${projectData.name}`,
        titleAr: `تم إنشاء المشروع: ${projectData.nameAr}`,
        actorId,
      })
    }

    const appIdByCode = new Map<string, string>()
    for (const row of pack.apps) {
      const prev = await this.prisma.projectApp.findFirst({
        where: {
          projectId,
          code: { equals: row.app_code, mode: 'insensitive' },
        },
      })
      const id = prev?.id ?? appIdFromCode(row.app_code)
      appIdByCode.set(row.app_code, id)
      const owner = byEmail(row.owner_email)
      const data = {
        projectId,
        code: row.app_code,
        name: row.name_en || row.name_ar,
        nameAr: row.name_ar || row.name_en,
        description: row.description_ar || '',
        descriptionAr: row.description_ar || '',
        ownerId: owner?.id ?? prev?.ownerId ?? null,
        status: row.status,
        plannedStart: row.planned_start,
        plannedEnd: row.planned_end,
        url: prev?.url ?? '',
        userCount: prev?.userCount ?? 0,
        readiness: prev?.readiness ?? 0,
        iconColor: prev?.iconColor ?? '#0F766E',
        publishStatus: prev?.publishStatus ?? 'Draft',
        featured: prev?.featured ?? false,
        sortOrder: prev?.sortOrder ?? (await this.prisma.projectApp.count()) + 1,
      }
      await this.prisma.projectApp.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      })
    }

    const projectMemberIds = new Set<string>()
    if (manager) projectMemberIds.add(manager.id)
    else projectMemberIds.add(managerId)

    const appMemberMap = new Map<string, Array<{ personId: string; role: string }>>()
    for (const t of pack.team) {
      const person = byEmail(t.person_email)
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

    for (const row of pack.apps) {
      const appId = appIdByCode.get(row.app_code)
      if (!appId) continue
      const list = appMemberMap.get(appId) ?? []
      const owner = byEmail(row.owner_email)
      if (owner && !list.some((m) => m.personId === owner.id)) {
        list.unshift({ personId: owner.id, role: 'AppManager' })
      }
      if (list.length) {
        appMemberMap.set(appId, list)
        await this.appMembers.setMembers(appId, list)
      }
    }

    await this.members.setMembers(projectId, [...projectMemberIds])
    for (const personId of projectMemberIds) {
      await this.access.syncPersonProjectIds(personId)
    }

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
        const assignee = byEmail(row.assignee_email)
        const depsCodes = row.depends_on
          ? row.depends_on
              .split(/[;,]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : []
        const data = {
          projectId,
          appId,
          code: row.item_code,
          parentId: parentId ?? null,
          name: row.name_en || row.name_ar,
          nameAr: row.name_ar || row.name_en,
          type: row.type,
          start: row.start || pack.project.planned_start,
          end: row.end || pack.project.planned_end,
          baselineStart: row.start || pack.project.planned_start,
          baselineEnd: row.end || pack.project.planned_end,
          progress: Math.min(100, Math.max(0, row.progress || 0)),
          weightPct: row.weight_pct ?? null,
          dependencies: depsCodes.map((c) => idByCode.get(c) ?? c),
          assigneeId: assignee?.id ?? null,
          critical: false,
          status: row.type === 'phase' ? 'In Progress' : row.progress >= 100 ? 'Completed' : 'To Do',
          description: row.deliverable_ar || null,
        }
        await this.prisma.wbsItem.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        })
        scheduleItems += 1
      }

      // Sync readiness from plan phases
      const app = await this.prisma.projectApp.findUnique({ where: { id: appId } })
      if (app) {
        const wbs = await this.prisma.wbsItem.findMany({ where: { appId } })
        const metrics = computeAppDashboardMetrics(app, wbs)
        if (metrics.hasPlan) {
          await this.prisma.projectApp.update({
            where: { id: appId },
            data: { readiness: Math.round(metrics.overallProgress) },
          })
        }
      }

      for (const row of plan.rows) {
        if (row.section !== 'milestone') continue
        const owner = byEmail(row.owner_email) ?? manager
        const deliverables = row.deliverables_ar
          ? row.deliverables_ar
              .split(/[;|]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : []
        const id = milestoneIdFromCodes(projectId, plan.app_code, row.item_code)
        const data = {
          projectId,
          name: row.name_en || row.name_ar,
          nameAr: row.name_ar || row.name_en,
          ownerId: owner?.id ?? actorId,
          baselineDate: row.baseline_date || pack.project.planned_end,
          forecastDate: row.forecast_date || row.baseline_date || pack.project.planned_end,
          status: row.status,
          dependencies: [] as string[],
          deliverables,
          deliverablesAr: deliverables,
        }
        await this.prisma.milestone.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        })
        milestones += 1
      }

      for (const row of plan.rows) {
        if (row.section !== 'risk') continue
        const owner = byEmail(row.owner_email) ?? manager
        const severity = row.severity
        const score =
          severity === 'Critical' ? 5 : severity === 'High' ? 4 : severity === 'Medium' ? 3 : 2
        const id = riskIdFromCodes(projectId, plan.app_code, row.item_code)
        const data = {
          projectId,
          title: row.name_en || row.name_ar,
          titleAr: row.name_ar || row.name_en,
          ownerId: owner?.id ?? actorId,
          probability: score,
          impact: score,
          severity,
          mitigation: '',
          mitigationAr: '',
          targetDate: row.end || pack.project.planned_end,
          status: row.status,
          type: row.type,
          overdue: false,
        }
        await this.prisma.risk.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        })
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
}
