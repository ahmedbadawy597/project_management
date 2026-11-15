import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { mapJobRoleToAppRole } from '../common/access.service'
import {
  DEFAULT_TEMP_PASSWORD,
  hashPassword,
  usernameFromEmail,
} from '../auth/password.util'
import { PrismaService } from '../prisma/prisma.service'
import { seedState } from '../seed-data'

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * On server start: if the DB has no users, load the official people + project seed.
   * Never wipes an already-populated database (safe for production / DevOps deploys).
   * Set AUTO_SEED=false to skip. Set FORCE_SEED=true to wipe and reseed (dev only).
   */
  async onModuleInit() {
    if (this.config.get<string>('AUTO_SEED') === 'false') {
      this.logger.log('AUTO_SEED=false — skipping startup seed')
      return
    }

    if (this.config.get<string>('FORCE_SEED') === 'true') {
      this.logger.warn('FORCE_SEED=true — resetting database to seed data')
      await this.resetDatabase()
      this.logger.log(
        `Force seed complete (${seedState.people.length} users, ${seedState.projects.length} projects)`,
      )
      return
    }

    await this.ensureSeeded()
  }

  /** Seed only when the people table is empty. */
  async ensureSeeded() {
    const count = await this.prisma.person.count()
    if (count > 0) {
      this.logger.log(`Database already has ${count} users — skip seed`)
      return
    }

    this.logger.log('Empty database — seeding official users and projects…')
    await this.resetDatabase()
    this.logger.log(
      `Seed complete (${seedState.people.length} users, ${seedState.projects.length} projects). Temp password: ${DEFAULT_TEMP_PASSWORD}`,
    )
  }

  async resetDatabase() {
    await this.prisma.$transaction([
      this.prisma.approvalComment.deleteMany(),
      this.prisma.approval.deleteMany(),
      this.prisma.activityItem.deleteMany(),
      this.prisma.documentItem.deleteMany(),
      this.prisma.budgetTransaction.deleteMany(),
      this.prisma.risk.deleteMany(),
      this.prisma.slaRecord.deleteMany(),
      this.prisma.milestone.deleteMany(),
      this.prisma.ticketComment.deleteMany(),
      this.prisma.ticket.deleteMany(),
      this.prisma.wbsItem.deleteMany(),
      this.prisma.appMember.deleteMany(),
      this.prisma.projectMember.deleteMany(),
      this.prisma.projectApp.deleteMany(),
      this.prisma.notificationItem.deleteMany(),
      this.prisma.project.deleteMany(),
      this.prisma.person.deleteMany(),
    ])

    const passwordHash = await hashPassword(DEFAULT_TEMP_PASSWORD)
    await this.prisma.person.createMany({
      data: seedState.people.map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.nameAr,
        role: p.role,
        appRole: mapJobRoleToAppRole(p.role),
        email: p.email,
        username: usernameFromEmail(p.email),
        passwordHash,
        mustChangePassword: true,
        department: p.department,
        allocation: p.allocation,
        availability: p.availability,
        active: true,
        projectIds: p.projectIds,
      })),
    })

    await this.prisma.project.createMany({
      data: seedState.projects.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        nameAr: p.nameAr,
        description: p.description,
        descriptionAr: p.descriptionAr,
        managerId: p.managerId,
        status: p.status,
        plannedProgress: p.plannedProgress,
        actualProgress: p.actualProgress,
        plannedStart: p.plannedStart,
        plannedEnd: p.plannedEnd,
        forecastEnd: p.forecastEnd,
        actualStart: p.actualStart,
        phase: p.phase,
        budgetApproved: p.budgetApproved,
        budgetAllocated: p.budgetAllocated,
        budgetSpent: p.budgetSpent,
        slaCompliance: p.slaCompliance,
        riskLevel: p.riskLevel,
        summary: p.summary,
        summaryAr: p.summaryAr,
        managerUpdate: p.managerUpdate,
        managerUpdateAr: p.managerUpdateAr,
        charter: p.charter,
        charterAr: p.charterAr,
      })),
    })

    await this.prisma.projectApp.createMany({
      data: seedState.apps.map((a, index) => ({
        id: a.id,
        projectId: a.projectId,
        code: a.code,
        name: a.name,
        nameAr: a.nameAr,
        description: a.description,
        descriptionAr: a.descriptionAr,
        ownerId: a.ownerId ?? null,
        status: a.status,
        plannedStart: a.plannedStart,
        plannedEnd: a.plannedEnd,
        url: a.url ?? '',
        userCount: a.userCount ?? 0,
        readiness: a.readiness ?? 0,
        iconColor: a.iconColor ?? '#0F766E',
        publishStatus: a.publishStatus ?? 'يعمل',
        featured: a.featured !== false,
        sortOrder: a.sortOrder ?? index + 1,
      })),
    })

    // Project membership for the 10 official accounts (no automatic app-team assignment)
    const memberRows: { projectId: string; personId: string }[] = []
    for (const person of seedState.people) {
      for (const projectId of person.projectIds) {
        memberRows.push({ projectId, personId: person.id })
      }
    }
    for (const project of seedState.projects) {
      if (!memberRows.some((m) => m.projectId === project.id && m.personId === project.managerId)) {
        memberRows.push({ projectId: project.id, personId: project.managerId })
      }
    }
    const uniqueMembers = Array.from(
      new Map(memberRows.map((m) => [`${m.projectId}:${m.personId}`, m])).values(),
    )
    if (uniqueMembers.length) {
      await this.prisma.projectMember.createMany({ data: uniqueMembers })
    }

    // App teams left empty — Admin/PMs assign App Manager, Developers, Business explicitly

    if (seedState.wbs.length) {
      await this.prisma.wbsItem.createMany({
        data: seedState.wbs.map((w) => ({
          id: w.id,
          projectId: w.projectId,
          parentId: w.parentId,
          name: w.name,
          nameAr: w.nameAr,
          type: w.type,
          start: w.start,
          end: w.end,
          baselineStart: w.baselineStart,
          baselineEnd: w.baselineEnd,
          progress: w.progress,
          dependencies: w.dependencies,
          assigneeId: w.assigneeId,
          critical: Boolean(w.critical),
          status: w.status,
          priority: w.priority,
          estimatedHours: w.estimatedHours,
          actualHours: w.actualHours,
          description: w.description,
        })),
      })
    }

    if (seedState.milestones.length) {
      await this.prisma.milestone.createMany({
        data: seedState.milestones.map((m) => ({
          id: m.id,
          projectId: m.projectId,
          name: m.name,
          nameAr: m.nameAr,
          ownerId: m.ownerId,
          baselineDate: m.baselineDate,
          forecastDate: m.forecastDate,
          actualDate: m.actualDate,
          status: m.status,
          dependencies: m.dependencies,
          deliverables: m.deliverables,
          deliverablesAr: m.deliverablesAr ?? m.deliverables,
        })),
      })
    }

    if (seedState.slas.length) {
      await this.prisma.slaRecord.createMany({
        data: seedState.slas.map((s) => ({
          id: s.id,
          reference: s.reference,
          projectId: s.projectId,
          category: s.category,
          managerId: s.managerId,
          targetHours: s.targetHours,
          consumedHours: s.consumedHours,
          compliance: s.compliance,
          status: s.status,
          warningThreshold: s.warningThreshold,
          openedAt: s.openedAt,
          dueAt: s.dueAt,
          escalationCount: s.escalationCount,
        })),
      })
    }

    if (seedState.risks.length) {
      await this.prisma.risk.createMany({
        data: seedState.risks.map((r) => ({
          id: r.id,
          projectId: r.projectId,
          title: r.title,
          titleAr: r.titleAr,
          ownerId: r.ownerId,
          probability: r.probability,
          impact: r.impact,
          severity: r.severity,
          mitigation: r.mitigation,
          mitigationAr: r.mitigationAr,
          targetDate: r.targetDate,
          status: r.status,
          type: r.type,
          overdue: Boolean(r.overdue),
        })),
      })
    }

    if (seedState.transactions.length) {
      await this.prisma.budgetTransaction.createMany({
        data: seedState.transactions.map((t) => ({
          id: t.id,
          projectId: t.projectId,
          date: t.date,
          category: t.category,
          description: t.description,
          amount: t.amount,
          type: t.type,
        })),
      })
    }

    for (const a of seedState.approvals) {
      await this.prisma.approval.create({
        data: {
          id: a.id,
          projectId: a.projectId,
          type: a.type,
          title: a.title,
          titleAr: a.titleAr,
          requesterId: a.requesterId,
          status: a.status,
          submittedAt: a.submittedAt,
          decidedAt: a.decidedAt,
          comments: {
            create: a.comments.map((c) => ({
              authorId: c.authorId,
              text: c.text,
              at: c.at,
            })),
          },
        },
      })
    }

    if (seedState.documents.length) {
      await this.prisma.documentItem.createMany({
        data: seedState.documents.map((d) => ({
          id: d.id,
          projectId: d.projectId,
          name: d.name,
          category: d.category,
          uploadedBy: d.uploadedBy,
          uploadedAt: d.uploadedAt,
          size: d.size,
          version: d.version,
        })),
      })
    }

    if (seedState.activities.length) {
      await this.prisma.activityItem.createMany({
        data: seedState.activities.map((a) => ({
          id: a.id,
          projectId: a.projectId,
          type: a.type,
          title: a.title,
          titleAr: a.titleAr,
          actorId: a.actorId,
          at: a.at,
        })),
      })
    }

    if (seedState.notifications.length) {
      await this.prisma.notificationItem.createMany({
        data: seedState.notifications.map((n) => ({
          id: n.id,
          title: n.title,
          titleAr: n.titleAr,
          body: n.body,
          bodyAr: n.bodyAr,
          at: n.at,
          read: n.read,
          href: n.href,
        })),
      })
    }
  }
}
