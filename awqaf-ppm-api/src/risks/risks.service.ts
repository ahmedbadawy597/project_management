import { Injectable } from '@nestjs/common'
import { mapRisk } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RisksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId?: string) {
    const rows = await this.prisma.risk.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { id: 'asc' },
    })
    return rows.map(mapRisk)
  }

  async upsert(body: Record<string, unknown>) {
    const id = String(body.id || `risk-${Date.now()}`)
    const data = {
      projectId: String(body.projectId),
      title: String(body.title),
      titleAr: String(body.titleAr ?? body.title),
      ownerId: String(body.ownerId),
      probability: Number(body.probability),
      impact: Number(body.impact),
      severity: String(body.severity),
      mitigation: String(body.mitigation ?? ''),
      mitigationAr: String(body.mitigationAr ?? ''),
      targetDate: String(body.targetDate),
      status: String(body.status),
      type: String(body.type ?? 'risk'),
      overdue: Boolean(body.overdue),
    }
    const row = await this.prisma.risk.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
    return mapRisk(row)
  }
}
