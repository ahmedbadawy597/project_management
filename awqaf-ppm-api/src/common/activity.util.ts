import { PrismaService } from '../prisma/prisma.service'

export async function pushActivity(
  prisma: PrismaService,
  partial: {
    projectId: string
    type: string
    title: string
    titleAr: string
    actorId: string
    at?: string
  },
) {
  return prisma.activityItem.create({
    data: {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: partial.projectId,
      type: partial.type,
      title: partial.title,
      titleAr: partial.titleAr,
      actorId: partial.actorId,
      at: partial.at ?? new Date().toISOString(),
    },
  })
}
