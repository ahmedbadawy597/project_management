import { Injectable, NotFoundException } from '@nestjs/common'
import { pushActivity } from '../common/activity.util'
import { computeAppDashboardMetrics } from '../common/app-dashboard-metrics'
import { mapWbs } from '../common/mappers'
import { inferScheduleState, inferWbsStatus } from '../common/schedule-intelligence'
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

  /** Keep parent phase progress/status aligned with child work. */
  private async rollupParent(parentId: string | null | undefined) {
    if (!parentId) return
    const parent = await this.prisma.wbsItem.findUnique({ where: { id: parentId } })
    if (!parent || parent.type !== 'phase') return

    const kids = await this.prisma.wbsItem.findMany({
      where: { parentId, type: { in: ['task', 'phase'] } },
    })
    if (!kids.length) return

    const avg = kids.reduce((s, k) => s + (k.progress ?? 0), 0) / kids.length
    const progress = Math.round(avg * 10) / 10
    const status = inferWbsStatus(progress, parent.start, parent.end)
    await this.prisma.wbsItem.update({
      where: { id: parent.id },
      data: { progress, status },
    })
    await this.rollupParent(parent.parentId)
  }

  async upsert(task: Record<string, unknown>, actorId: string) {
    const id = String(task.id || `wbs-${Date.now()}`)
    const existing = await this.prisma.wbsItem.findUnique({ where: { id } })
    const start = String(task.start)
    const end = String(task.end)
    let progress = Number(task.progress ?? 0)
    let status = String(task.status || 'To Do')

    // Keep progress ↔ status consistent, then soft-fill from calendar when still empty.
    if (status === 'Completed') progress = 100
    else if (progress >= 100) status = 'Completed'
    else if (progress > 0 && (status === 'To Do' || status === 'Backlog')) status = 'In Progress'

    if (progress <= 0 && status !== 'Completed') {
      const smart = inferScheduleState(start, end, progress)
      progress = smart.progress
      status = smart.status
    } else {
      status = inferWbsStatus(progress, start, end)
    }

    const data = {
      projectId: String(task.projectId),
      appId: task.appId ? String(task.appId) : null,
      code: task.code ? String(task.code) : null,
      parentId: task.parentId ? String(task.parentId) : null,
      name: String(task.name),
      nameAr: String(task.nameAr ?? task.name),
      type: String(task.type),
      start,
      end,
      baselineStart: String(task.baselineStart ?? task.start),
      baselineEnd: String(task.baselineEnd ?? task.end),
      progress,
      weightPct:
        task.weightPct === undefined || task.weightPct === null || task.weightPct === ''
          ? null
          : Number(task.weightPct),
      dependencies: Array.isArray(task.dependencies) ? (task.dependencies as string[]) : [],
      assigneeId: task.assigneeId ? String(task.assigneeId) : null,
      critical: Boolean(task.critical),
      status,
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
    await this.rollupParent(row.parentId)
    await this.syncAppReadiness(row.appId)
    if (existing?.appId && existing.appId !== row.appId) {
      await this.syncAppReadiness(existing.appId)
    }
    return mapWbs(row)
  }

  async updateStatus(id: string, status: string) {
    const existing = await this.prisma.wbsItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Not found')

    let progress = existing.progress
    if (status === 'Completed') progress = 100
    else if (status === 'To Do' || status === 'Backlog') progress = 0
    else if (progress <= 0) {
      // Starting work → at least calendar baseline so the bar moves.
      progress = inferScheduleState(existing.start, existing.end, 0).progress || 1
    }

    const row = await this.prisma.wbsItem.update({
      where: { id },
      data: {
        status,
        progress,
      },
    })
    await this.rollupParent(row.parentId)
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
    if (existing?.parentId) await this.rollupParent(existing.parentId)
    await this.syncAppReadiness(existing?.appId)
  }
}
