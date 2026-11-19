import { Injectable, NotFoundException } from '@nestjs/common'
import { AccessService } from '../common/access.service'
import { pushActivity } from '../common/activity.util'
import { mapProject } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateProjectDto } from './dto/create-project.dto'

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list() {
    const rows = await this.prisma.project.findMany({ orderBy: { id: 'asc' } })
    return rows.map(mapProject)
  }

  async get(id: string) {
    const row = await this.prisma.project.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Not found')
    return mapProject(row)
  }

  async create(body: CreateProjectDto, actorId: string) {
    const id = `prj-${Date.now()}`
    const project = await this.prisma.project.create({
      data: {
        id,
        code: body.code.trim(),
        name: body.name.trim(),
        nameAr: (body.nameAr || body.name).trim(),
        description: body.description?.trim() ?? '',
        descriptionAr: body.descriptionAr?.trim() ?? '',
        managerId: body.managerId,
        status: body.status ?? 'Planned',
        plannedProgress: 0,
        actualProgress: 0,
        plannedStart: body.plannedStart,
        plannedEnd: body.plannedEnd,
        forecastEnd: body.plannedEnd,
        phase: body.phase?.trim() || 'Initiation',
        budgetApproved: body.budgetApproved ?? 0,
        budgetAllocated: 0,
        budgetSpent: 0,
        slaCompliance: 100,
        riskLevel: body.riskLevel ?? 'Low',
        summary: '',
        summaryAr: '',
        managerUpdate: '',
        managerUpdateAr: '',
        charter: body.charter?.trim() ?? '',
        charterAr: body.charterAr?.trim() ?? '',
      },
    })
    await this.prisma.projectMember.create({
      data: { projectId: id, personId: body.managerId },
    })
    await this.syncManagerAssignment(undefined, body.managerId, id)
    await this.access.syncPersonProjectIds(body.managerId)
    await pushActivity(this.prisma, {
      projectId: id,
      type: 'status',
      title: `Project created: ${project.name}`,
      titleAr: `تم إنشاء المشروع: ${project.nameAr}`,
      actorId,
    })
    return mapProject(project)
  }

  async update(id: string, patch: Record<string, unknown>) {
    const prev = await this.prisma.project.findUnique({ where: { id } })
    if (!prev) throw new NotFoundException('Not found')
    const { id: _ignore, ...data } = patch
    const updated = await this.prisma.project.update({
      where: { id },
      data: data as never,
    })
    if (typeof patch.managerId === 'string' && patch.managerId !== prev.managerId) {
      await this.syncManagerAssignment(prev.managerId, patch.managerId, id)
    }
    return mapProject(updated)
  }

  /** Deletes project and cascaded apps, plan, tickets, and related records. */
  async remove(id: string) {
    const prev = await this.prisma.project.findUnique({
      where: { id },
      include: { members: { select: { personId: true } } },
    })
    if (!prev) throw new NotFoundException('Not found')

    const memberIds = [
      ...new Set([prev.managerId, ...prev.members.map((m) => m.personId)]),
    ]

    await this.prisma.project.delete({ where: { id } })

    for (const personId of memberIds) {
      await this.access.syncPersonProjectIds(personId)
    }

    return { ok: true as const, id }
  }

  private async syncManagerAssignment(
    prevManagerId: string | undefined,
    nextManagerId: string,
    projectId: string,
  ) {
    if (prevManagerId) {
      const prev = await this.prisma.person.findUnique({ where: { id: prevManagerId } })
      if (prev) {
        await this.prisma.person.update({
          where: { id: prevManagerId },
          data: { projectIds: prev.projectIds.filter((pid) => pid !== projectId) },
        })
      }
    }
    const next = await this.prisma.person.findUnique({ where: { id: nextManagerId } })
    if (next && !next.projectIds.includes(projectId)) {
      await this.prisma.person.update({
        where: { id: nextManagerId },
        data: { projectIds: [...next.projectIds, projectId] },
      })
    }
  }
}
