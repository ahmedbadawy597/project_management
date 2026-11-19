import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { computeAppDashboardMetrics } from '../common/app-dashboard-metrics'
import { mapApp } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'
import { AppMembersService, type MemberInput } from './app-members.service'

function catalogFields(body: Record<string, unknown>) {
  return {
    url: String(body.url ?? ''),
    userCount: Number.isFinite(Number(body.userCount)) ? Number(body.userCount) : 0,
    readiness: Math.max(0, Math.min(100, Number(body.readiness) || 0)),
    iconColor: String(body.iconColor ?? '#0F766E'),
    publishStatus: String(body.publishStatus ?? 'Draft'),
    featured: Boolean(body.featured),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
  }
}

@Injectable()
export class AppsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly members: AppMembersService,
  ) {}

  async list(projectId?: string) {
    const rows = await this.prisma.projectApp.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    return rows.map(mapApp)
  }

  async create(body: Record<string, unknown>) {
    if (!body.projectId || !String(body.code ?? '').trim() || !String(body.name ?? '').trim()) {
      throw new BadRequestException('Missing required fields')
    }
    const projectId = String(body.projectId)
    const id = String(body.id || `app-${Date.now()}`)
    let ownerId = body.ownerId ? String(body.ownerId) : null
    const membersInput = Array.isArray(body.members) ? (body.members as MemberInput[]) : []

    if (membersInput.length) {
      const normalized = this.members.normalizeMembers(membersInput)
      const mgr = normalized.find((m) => m.role === 'AppManager')
      if (mgr) ownerId = mgr.personId
    }

    const maxOrder = await this.prisma.projectApp.aggregate({ _max: { sortOrder: true } })
    const catalog = catalogFields(body)
    if (!body.sortOrder) catalog.sortOrder = (maxOrder._max.sortOrder ?? 0) + 1

    const row = await this.prisma.projectApp.create({
      data: {
        id,
        projectId,
        code: String(body.code).trim(),
        name: String(body.name).trim(),
        nameAr: String(body.nameAr || body.name).trim(),
        description: String(body.description ?? ''),
        descriptionAr: String(body.descriptionAr ?? ''),
        ownerId,
        status: String(body.status ?? 'Planned'),
        plannedStart: String(body.plannedStart ?? ''),
        plannedEnd: String(body.plannedEnd ?? ''),
        ...catalog,
      },
    })

    if (membersInput.length) {
      await this.members.setMembers(id, membersInput)
    } else {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } })
      const defaults: MemberInput[] = []
      if (ownerId) defaults.push({ personId: ownerId, role: 'AppManager' })
      else if (project?.managerId) defaults.push({ personId: project.managerId, role: 'AppManager' })
      if (project?.managerId && project.managerId !== ownerId) {
        defaults.push({ personId: project.managerId, role: 'Contributor' })
      }
      if (defaults.length) await this.members.setMembers(id, defaults)
    }

    return mapApp(row)
  }

  async upsert(id: string, body: Record<string, unknown>) {
    const data = {
      projectId: String(body.projectId),
      code: String(body.code).trim(),
      name: String(body.name).trim(),
      nameAr: String(body.nameAr || body.name).trim(),
      description: String(body.description ?? ''),
      descriptionAr: String(body.descriptionAr ?? ''),
      ownerId: body.ownerId ? String(body.ownerId) : null,
      status: String(body.status ?? 'Planned'),
      plannedStart: String(body.plannedStart ?? ''),
      plannedEnd: String(body.plannedEnd ?? ''),
      ...catalogFields(body),
    }
    const row = await this.prisma.projectApp.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
    if (Array.isArray(body.members)) {
      await this.members.setMembers(id, body.members as MemberInput[])
    }
    return mapApp(row)
  }

  async reorder(orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.projectApp.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    )
    return this.list()
  }

  async remove(id: string) {
    try {
      await this.prisma.projectApp.delete({ where: { id } })
    } catch {
      throw new NotFoundException('Not found')
    }
  }

  async dashboard(id: string) {
    const app = await this.prisma.projectApp.findUnique({ where: { id } })
    if (!app) throw new NotFoundException('Not found')
    const wbs = await this.prisma.wbsItem.findMany({ where: { appId: id } })
    return computeAppDashboardMetrics(app, wbs)
  }
}
