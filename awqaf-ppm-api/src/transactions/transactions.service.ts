import { Injectable } from '@nestjs/common'
import { mapTx } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId?: string) {
    const rows = await this.prisma.budgetTransaction.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { id: 'asc' },
    })
    return rows.map(mapTx)
  }

  async add(body: Record<string, unknown>) {
    const id = String(body.id || `tx-${Date.now()}`)
    const amount = Number(body.amount)
    const type = String(body.type)
    const projectId = String(body.projectId)
    const row = await this.prisma.budgetTransaction.create({
      data: {
        id,
        projectId,
        date: String(body.date),
        category: String(body.category),
        description: String(body.description ?? ''),
        amount,
        type,
      },
    })
    if (type === 'expense') {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { budgetSpent: { increment: amount } },
      })
    }
    if (type === 'adjustment') {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { budgetAllocated: { increment: amount } },
      })
    }
    return mapTx(row)
  }
}
