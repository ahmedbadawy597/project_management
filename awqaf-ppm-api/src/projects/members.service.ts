import { Injectable, NotFoundException } from '@nestjs/common'
import { AccessService } from '../common/access.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } })
    if (!project) throw new NotFoundException('Not found')
    const rows = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { person: true },
      orderBy: { createdAt: 'asc' },
    })
    return {
      projectId,
      managerId: project.managerId,
      memberIds: rows.map((r) => r.personId),
      members: rows.map((r) => ({
        personId: r.personId,
        name: r.person.name,
        nameAr: r.person.nameAr,
        email: r.person.email,
        role: r.person.role,
        appRole: r.person.appRole,
      })),
    }
  }

  async setMembers(projectId: string, personIds: string[]) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } })
    if (!project) throw new NotFoundException('Not found')

    const unique = [...new Set(personIds.filter(Boolean))]
    const existing = await this.prisma.projectMember.findMany({ where: { projectId } })
    const prevIds = existing.map((e) => e.personId)

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.deleteMany({ where: { projectId } })
      if (unique.length) {
        await tx.projectMember.createMany({
          data: unique.map((personId) => ({ projectId, personId })),
        })
      }
    })

    const touched = [...new Set([...prevIds, ...unique, project.managerId])]
    for (const personId of touched) {
      await this.access.syncPersonProjectIds(personId)
    }

    return this.list(projectId)
  }
}
