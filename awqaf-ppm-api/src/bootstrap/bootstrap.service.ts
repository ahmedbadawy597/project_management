import { Injectable } from '@nestjs/common'
import type { AppRole } from '../common/capabilities'
import { AccessService } from '../common/access.service'
import {
  mapActivity,
  mapApp,
  mapApproval,
  mapDoc,
  mapMilestone,
  mapNotification,
  mapPerson,
  mapProject,
  mapRisk,
  mapSla,
  mapTx,
  mapWbs,
} from '../common/mappers'
import { SeedService } from '../demo/seed.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BootstrapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seed: SeedService,
    private readonly access: AccessService,
  ) {}

  async snapshot(personId?: string, role?: AppRole) {
    const projectScope =
      personId && role ? await this.access.accessibleProjectIds(personId, role) : 'all'
    const appScope =
      personId && role ? await this.access.accessibleAppIds(personId, role) : 'all'

    const projectWhere = projectScope === 'all' ? undefined : { id: { in: projectScope } }
    const relatedWhere =
      projectScope === 'all' ? undefined : { projectId: { in: projectScope } }
    const appsFilter =
      appScope === 'all'
        ? projectScope === 'all'
          ? undefined
          : { projectId: { in: projectScope } }
        : {
            id: { in: appScope },
            ...(projectScope === 'all' ? {} : { projectId: { in: projectScope } }),
          }

    const [
      projects,
      people,
      wbs,
      milestones,
      slas,
      risks,
      transactions,
      approvals,
      documents,
      activities,
      notifications,
      apps,
      members,
      appMembers,
    ] = await Promise.all([
      this.prisma.project.findMany({ where: projectWhere, orderBy: { id: 'asc' } }),
      this.prisma.person.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.wbsItem.findMany({ where: relatedWhere, orderBy: { id: 'asc' } }),
      this.prisma.milestone.findMany({ where: relatedWhere, orderBy: { id: 'asc' } }),
      this.prisma.slaRecord.findMany({ where: relatedWhere, orderBy: { id: 'asc' } }),
      this.prisma.risk.findMany({ where: relatedWhere, orderBy: { id: 'asc' } }),
      this.prisma.budgetTransaction.findMany({ where: relatedWhere, orderBy: { id: 'asc' } }),
      this.prisma.approval.findMany({
        where: relatedWhere,
        include: { comments: { orderBy: { at: 'asc' } } },
        orderBy: { id: 'asc' },
      }),
      this.prisma.documentItem.findMany({ where: relatedWhere, orderBy: { id: 'asc' } }),
      this.prisma.activityItem.findMany({ where: relatedWhere, orderBy: { at: 'desc' } }),
      this.prisma.notificationItem.findMany({ orderBy: { at: 'desc' } }),
      this.prisma.projectApp.findMany({ where: appsFilter, orderBy: { id: 'asc' } }),
      this.prisma.projectMember.findMany({
        where: projectScope === 'all' ? undefined : { projectId: { in: projectScope } },
      }),
      this.prisma.appMember.findMany({
        where: appScope === 'all' ? undefined : { appId: { in: appScope } },
      }),
    ])

    const membersByProject: Record<string, string[]> = {}
    for (const m of members) {
      membersByProject[m.projectId] ??= []
      membersByProject[m.projectId].push(m.personId)
    }

    const appMembersByApp: Record<string, Array<{ personId: string; role: string }>> = {}
    const accessByApp: Record<string, string[]> = {}
    for (const m of appMembers) {
      appMembersByApp[m.appId] ??= []
      appMembersByApp[m.appId].push({ personId: m.personId, role: m.role })
      accessByApp[m.appId] ??= []
      accessByApp[m.appId].push(m.personId)
    }

    return {
      projects: projects.map(mapProject),
      people: people.map(mapPerson),
      wbs: wbs.map(mapWbs),
      milestones: milestones.map(mapMilestone),
      slas: slas.map(mapSla),
      risks: risks.map(mapRisk),
      transactions: transactions.map(mapTx),
      approvals: approvals.map(mapApproval),
      documents: documents.map(mapDoc),
      activities: activities.map(mapActivity),
      notifications: notifications.map(mapNotification),
      apps: apps.map(mapApp),
      projectMembers: membersByProject,
      appMembers: appMembersByApp,
      /** @deprecated prefer appMembers — kept for older UI */
      appAccess: accessByApp,
    }
  }

  async reset(personId?: string, role?: AppRole) {
    await this.seed.resetDatabase()
    return this.snapshot(personId, role)
  }
}
