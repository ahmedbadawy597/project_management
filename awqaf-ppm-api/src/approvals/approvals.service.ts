import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { pushActivity } from '../common/activity.util'
import { mapApproval } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId?: string) {
    const rows = await this.prisma.approval.findMany({
      where: projectId ? { projectId } : undefined,
      include: { comments: { orderBy: { at: 'asc' } } },
      orderBy: { id: 'asc' },
    })
    return rows.map(mapApproval)
  }

  async decide(
    id: string,
    status: 'Approved' | 'Rejected',
    actorId: string,
    comment?: string,
  ) {
    if (status === 'Rejected' && !comment?.trim()) {
      throw new BadRequestException('Comment required on reject')
    }
    const current = await this.prisma.approval.findUnique({
      where: { id },
      include: { comments: true },
    })
    if (!current) throw new NotFoundException('Not found')
    if (current.status !== 'Pending') return mapApproval(current)

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status,
        decidedAt: new Date().toISOString(),
        comments: comment
          ? {
              create: {
                authorId: actorId,
                text: comment,
                at: new Date().toISOString(),
              },
            }
          : undefined,
      },
      include: { comments: { orderBy: { at: 'asc' } } },
    })
    await pushActivity(this.prisma, {
      projectId: updated.projectId,
      type: 'approval',
      title: `Approval ${status.toLowerCase()}`,
      titleAr: status === 'Approved' ? 'تم اعتماد الطلب' : 'تم رفض الطلب',
      actorId,
    })
    return mapApproval(updated)
  }
}
