import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { AppRole } from '../common/capabilities'
import { AccessService, TICKET_TAGS } from '../common/access.service'
import { PrismaService } from '../prisma/prisma.service'

function mapTicket(
  t: {
    id: string
    projectId: string
    appId: string | null
    type: string
    status: string
    priority: string
    urgency: string
    tags: string[]
    title: string
    titleAr: string
    body: string
    bodyAr: string
    reporterId: string
    assigneeId: string | null
    linkedRiskId: string | null
    linkedWbsId: string | null
    createdAt: Date
    updatedAt: Date
    comments?: Array<{ id: string; ticketId: string; authorId: string; body: string; createdAt: Date }>
  },
  commentCount?: number,
) {
  return {
    id: t.id,
    projectId: t.projectId,
    appId: t.appId ?? undefined,
    type: t.type,
    status: t.status,
    priority: t.priority,
    urgency: t.urgency,
    tags: t.tags,
    title: t.title,
    titleAr: t.titleAr,
    body: t.body,
    bodyAr: t.bodyAr,
    reporterId: t.reporterId,
    assigneeId: t.assigneeId ?? undefined,
    linkedRiskId: t.linkedRiskId ?? undefined,
    linkedWbsId: t.linkedWbsId ?? undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    commentCount: commentCount ?? t.comments?.length ?? 0,
    comments: t.comments?.map((c) => ({
      id: c.id,
      ticketId: c.ticketId,
      authorId: c.authorId,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  }
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  private normalizeTags(tags: string[] | undefined, urgency: string) {
    const set = new Set((tags ?? []).filter((t) => TICKET_TAGS.includes(t as never)))
    if (urgency === 'Immediate') set.add('Immediate')
    return [...set]
  }

  private async assertCanSeeTicket(
    personId: string,
    role: AppRole,
    ticket: { projectId: string; appId: string | null },
  ) {
    if (this.access.isFullAccess(role)) return
    if (ticket.appId) {
      const ok = await this.access.canAccessApp(personId, role, ticket.appId)
      if (!ok) throw new ForbiddenException('Forbidden')
      return
    }
    const ok = await this.access.canAccessProject(personId, role, ticket.projectId)
    if (!ok) throw new ForbiddenException('Forbidden')
  }

  async list(
    personId: string,
    role: AppRole,
    filters: {
      projectId?: string
      appId?: string
      assigneeId?: string
      status?: string
      tag?: string
      urgency?: string
    },
  ) {
    const appScope = await this.access.accessibleAppIds(personId, role)
    const projectScope = await this.access.accessibleProjectIds(personId, role)

    const where: Record<string, unknown> = {}
    if (filters.projectId) where.projectId = filters.projectId
    if (filters.appId) where.appId = filters.appId
    if (filters.assigneeId) where.assigneeId = filters.assigneeId
    if (filters.status) where.status = filters.status
    if (filters.urgency) where.urgency = filters.urgency
    if (filters.tag) where.tags = { has: filters.tag }

    if (appScope !== 'all') {
      where.OR = [
        { appId: { in: appScope } },
        {
          AND: [
            { appId: null },
            projectScope === 'all' ? {} : { projectId: { in: projectScope } },
          ],
        },
      ]
    }

    const rows = await this.prisma.ticket.findMany({
      where,
      include: { _count: { select: { comments: true } } },
      orderBy: [{ urgency: 'desc' }, { updatedAt: 'desc' }],
    })

    // Sort Immediate first client-side style
    const urgencyRank: Record<string, number> = { Immediate: 0, High: 1, Normal: 2 }
    rows.sort(
      (a, b) =>
        (urgencyRank[a.urgency] ?? 9) - (urgencyRank[b.urgency] ?? 9) ||
        b.updatedAt.getTime() - a.updatedAt.getTime(),
    )

    return rows.map((t) => mapTicket(t, t._count.comments))
  }

  async get(id: string, personId: string, role: AppRole) {
    const row = await this.prisma.ticket.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    })
    if (!row) throw new NotFoundException('Not found')
    await this.assertCanSeeTicket(personId, role, row)
    return mapTicket(row)
  }

  async create(
    personId: string,
    role: AppRole,
    body: {
      projectId: string
      appId?: string
      type: string
      status?: string
      priority?: string
      urgency?: string
      tags?: string[]
      title: string
      titleAr?: string
      body?: string
      bodyAr?: string
      assigneeId?: string
      linkedRiskId?: string
      linkedWbsId?: string
    },
  ) {
    if (body.appId) {
      const ok = await this.access.canAccessApp(personId, role, body.appId)
      if (!ok) throw new ForbiddenException('Forbidden')
    } else {
      const ok = await this.access.canAccessProject(personId, role, body.projectId)
      if (!ok) throw new ForbiddenException('Forbidden')
    }

    const urgency = body.urgency ?? 'Normal'
    const tags = this.normalizeTags(body.tags, urgency)
    const id = `tkt-${Date.now()}`
    const row = await this.prisma.ticket.create({
      data: {
        id,
        projectId: body.projectId,
        appId: body.appId || null,
        type: body.type || 'Task',
        status: body.status ?? 'Open',
        priority: body.priority ?? 'Medium',
        urgency,
        tags,
        title: body.title.trim(),
        titleAr: (body.titleAr || body.title).trim(),
        body: body.body?.trim() ?? '',
        bodyAr: body.bodyAr?.trim() ?? '',
        reporterId: personId,
        assigneeId: body.assigneeId || null,
        linkedRiskId: body.linkedRiskId || null,
        linkedWbsId: body.linkedWbsId || null,
      },
      include: { comments: true },
    })

    if (body.assigneeId && body.assigneeId !== personId) {
      await this.notify(
        body.assigneeId,
        'Ticket assigned to you',
        'تم تعيين تذكرة لك',
        row.title,
        row.titleAr,
        `/tickets?id=${row.id}`,
      )
    }
    if (urgency === 'Immediate') {
      await this.notifyTeamImmediate(row)
    }

    return mapTicket(row)
  }

  async update(
    id: string,
    personId: string,
    role: AppRole,
    patch: Record<string, unknown>,
  ) {
    const existing = await this.prisma.ticket.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Not found')
    await this.assertCanSeeTicket(personId, role, existing)

    const urgency = typeof patch.urgency === 'string' ? patch.urgency : existing.urgency
    const tags = this.normalizeTags(
      Array.isArray(patch.tags) ? (patch.tags as string[]) : existing.tags,
      urgency,
    )

    const row = await this.prisma.ticket.update({
      where: { id },
      data: {
        type: typeof patch.type === 'string' ? patch.type : undefined,
        status: typeof patch.status === 'string' ? patch.status : undefined,
        priority: typeof patch.priority === 'string' ? patch.priority : undefined,
        urgency,
        tags,
        title: typeof patch.title === 'string' ? patch.title.trim() : undefined,
        titleAr: typeof patch.titleAr === 'string' ? patch.titleAr.trim() : undefined,
        body: typeof patch.body === 'string' ? patch.body : undefined,
        bodyAr: typeof patch.bodyAr === 'string' ? patch.bodyAr : undefined,
        assigneeId:
          patch.assigneeId === null
            ? null
            : typeof patch.assigneeId === 'string'
              ? patch.assigneeId
              : undefined,
        appId:
          patch.appId === null
            ? null
            : typeof patch.appId === 'string'
              ? patch.appId
              : undefined,
      },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    })

    if (
      typeof patch.assigneeId === 'string' &&
      patch.assigneeId !== existing.assigneeId &&
      patch.assigneeId !== personId
    ) {
      await this.notify(
        patch.assigneeId,
        'Ticket assigned to you',
        'تم تعيين تذكرة لك',
        row.title,
        row.titleAr,
        `/tickets?id=${row.id}`,
      )
    }
    if (urgency === 'Immediate' && existing.urgency !== 'Immediate') {
      await this.notifyTeamImmediate(row)
    }

    return mapTicket(row)
  }

  async addComment(id: string, personId: string, role: AppRole, body: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } })
    if (!ticket) throw new NotFoundException('Not found')
    await this.assertCanSeeTicket(personId, role, ticket)

    await this.prisma.ticketComment.create({
      data: { ticketId: id, authorId: personId, body: body.trim() },
    })
    await this.prisma.ticket.update({ where: { id }, data: { updatedAt: new Date() } })

    const notifyIds = new Set(
      [ticket.reporterId, ticket.assigneeId].filter(Boolean) as string[],
    )
    notifyIds.delete(personId)
    for (const nid of notifyIds) {
      await this.notify(
        nid,
        'New comment on ticket',
        'تعليق جديد على التذكرة',
        ticket.title,
        ticket.titleAr,
        `/tickets?id=${ticket.id}`,
      )
    }

    return this.get(id, personId, role)
  }

  private async notify(
    _personId: string,
    title: string,
    titleAr: string,
    body: string,
    bodyAr: string,
    href: string,
  ) {
    // Global notification feed (persona UI); person targeting is soft in v1
    await this.prisma.notificationItem.create({
      data: {
        id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        titleAr,
        body,
        bodyAr,
        at: new Date().toISOString(),
        read: false,
        href,
      },
    })
  }

  private async notifyTeamImmediate(ticket: {
    id: string
    title: string
    titleAr: string
    appId: string | null
  }) {
    await this.prisma.notificationItem.create({
      data: {
        id: `ntf-${Date.now()}-imm`,
        title: 'Immediate ticket',
        titleAr: 'تذكرة عاجلة',
        body: ticket.title,
        bodyAr: ticket.titleAr,
        at: new Date().toISOString(),
        read: false,
        href: `/tickets?id=${ticket.id}`,
      },
    })
  }
}
