import { Injectable, NotFoundException } from '@nestjs/common'
import { mapNotification } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.notificationItem.findMany({ orderBy: { at: 'desc' } })
    return rows.map(mapNotification)
  }

  async markRead(id: string) {
    try {
      const row = await this.prisma.notificationItem.update({
        where: { id },
        data: { read: true },
      })
      return mapNotification(row)
    } catch {
      throw new NotFoundException('Not found')
    }
  }

  async markAllRead() {
    await this.prisma.notificationItem.updateMany({ data: { read: true } })
    return this.list()
  }
}
