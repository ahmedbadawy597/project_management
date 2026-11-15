import { Injectable } from '@nestjs/common'
import { mapDoc } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId?: string) {
    const rows = await this.prisma.documentItem.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { id: 'asc' },
    })
    return rows.map(mapDoc)
  }

  async upload(
    body: {
      projectId: string
      name: string
      category: string
      size?: string
      version?: string
    },
    actorId: string,
  ) {
    const row = await this.prisma.documentItem.create({
      data: {
        id: `doc-${Date.now()}`,
        projectId: body.projectId,
        name: body.name,
        category: body.category,
        uploadedBy: actorId,
        uploadedAt: new Date().toISOString().slice(0, 10),
        size: body.size ?? '0 KB',
        version: body.version ?? '1.0',
      },
    })
    return mapDoc(row)
  }
}
