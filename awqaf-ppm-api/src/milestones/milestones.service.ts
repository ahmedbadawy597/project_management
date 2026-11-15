import { Injectable } from '@nestjs/common'
import { mapMilestone } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId?: string) {
    const rows = await this.prisma.milestone.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { id: 'asc' },
    })
    return rows.map(mapMilestone)
  }

  async upsert(id: string, body: Record<string, unknown>) {
    const data = {
      projectId: String(body.projectId),
      name: String(body.name),
      nameAr: String(body.nameAr ?? body.name),
      ownerId: String(body.ownerId),
      baselineDate: String(body.baselineDate),
      forecastDate: String(body.forecastDate),
      actualDate: body.actualDate ? String(body.actualDate) : null,
      status: String(body.status),
      dependencies: Array.isArray(body.dependencies) ? (body.dependencies as string[]) : [],
      deliverables: Array.isArray(body.deliverables) ? (body.deliverables as string[]) : [],
      deliverablesAr: Array.isArray(body.deliverablesAr)
        ? (body.deliverablesAr as string[])
        : Array.isArray(body.deliverables)
          ? (body.deliverables as string[])
          : [],
    }
    const row = await this.prisma.milestone.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
    return mapMilestone(row)
  }
}
