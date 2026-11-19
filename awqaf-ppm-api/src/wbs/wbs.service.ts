import { Injectable, NotFoundException } from '@nestjs/common'
import { pushActivity } from '../common/activity.util'
import { computeAppDashboardMetrics } from '../common/app-dashboard-metrics'
import { mapWbs } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class WbsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId?: string) {
    const rows = await this.prisma.wbsItem.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { id: 'asc' },
    })
    return rows.map(mapWbs)
  }

  private async syncAppReadiness(appId: string | null | undefined) {
    if (!appId) return
    const app = await this.prisma.projectApp.findUnique({ where: { id: appId } })
    if (!app) return
    const wbs = await this.prisma.wbsItem.findMany({ where: { appId } })
    const metrics = computeAppDashboardMetrics(app, wbs)
    if (metrics.hasPlan) {
      await this.prisma.projectApp.update({
        where: { id: appId },
        data: { readiness: Math.round(metrics.overallProgress) },
      })
    }
  }

  async upsert(task: Record<string, unknown>, actorId: string) {
    const id = String(task.id || `wbs-${Date.now()}`)
    const existing = await this.prisma.wbsItem.findUnique({ where: { id } })
    const data = {
      projectId: String(task.projectId),
      appId: task.appId ? String(task.appId) : null,
      code: task.code ? String(task.code) : null,
      parentId: task.parentId ? String(task.parentId) : null,
      name: String(task.name),
      nameAr: String(task.nameAr ?? task.name),
      type: String(task.type),
      start: String(task.start),
      end: String(task.end),
      baselineStart: String(task.baselineStart ?? task.start),
      baselineEnd: String(task.baselineEnd ?? task.end),
      progress: Number(task.progress ?? 0),
      weightPct:
        task.weightPct === undefined || task.weightPct === null || task.weightPct === ''
          ? null
          : Number(task.weightPct),
      dependencies: Array.isArray(task.dependencies) ? (task.dependencies as string[]) : [],
      assigneeId: task.assigneeId ? String(task.assigneeId) : null,
      critical: Boolean(task.critical),
      status: String(task.status),
      priority: task.priority ? String(task.priority) : null,
      estimatedHours:
        task.estimatedHours === undefined || task.estimatedHours === null
          ? null
          : Number(task.estimatedHours),
      actualHours:
        task.actualHours === undefined || task.actualHours === null
          ? null
          : Number(task.actualHours),
      description: task.description ? String(task.description) : null,
    }
    const row = await this.prisma.wbsItem.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
    await pushActivity(this.prisma, {
      projectId: row.projectId,
      type: 'task',
      title: existing ? `Task updated: ${row.name}` : `Task created: ${row.name}`,
      titleAr: existing
        ? `تم تحديث المهمة: ${row.nameAr}`
        : `تم إنشاء المهمة: ${row.nameAr}`,
      actorId,
    })
    await this.syncAppReadiness(row.appId)
    if (existing?.appId && existing.appId !== row.appId) {
      await this.syncAppReadiness(existing.appId)
    }
    return mapWbs(row)
  }

  async updateStatus(id: string, status: string) {
    const existing = await this.prisma.wbsItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Not found')
    const row = await this.prisma.wbsItem.update({
      where: { id },
      data: {
        status,
        progress: status === 'Completed' ? 100 : existing.progress,
      },
    })
    await this.syncAppReadiness(row.appId)
    return mapWbs(row)
  }

  async remove(id: string) {
    const existing = await this.prisma.wbsItem.findUnique({ where: { id } })
    try {
      await this.prisma.wbsItem.delete({ where: { id } })
    } catch {
      throw new NotFoundException('Not found')
    }
    await this.syncAppReadiness(existing?.appId)
  }
}
