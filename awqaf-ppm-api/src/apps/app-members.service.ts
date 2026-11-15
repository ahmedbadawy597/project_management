import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { APP_MEMBER_ROLES, type AppMemberRole } from '../common/access.service'
import { PrismaService } from '../prisma/prisma.service'

export type MemberInput = { personId: string; role: string }

@Injectable()
export class AppMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(appId: string) {
    const app = await this.prisma.projectApp.findUnique({ where: { id: appId } })
    if (!app) throw new NotFoundException('Not found')
    const rows = await this.prisma.appMember.findMany({
      where: { appId },
      include: { person: true },
      orderBy: { createdAt: 'asc' },
    })
    return {
      appId,
      projectId: app.projectId,
      ownerId: app.ownerId,
      members: rows.map((r) => ({
        personId: r.personId,
        role: r.role,
        name: r.person.name,
        nameAr: r.person.nameAr,
        email: r.person.email,
      })),
    }
  }

  async setMembers(appId: string, members: MemberInput[]) {
    const app = await this.prisma.projectApp.findUnique({ where: { id: appId } })
    if (!app) throw new NotFoundException('Not found')

    const normalized = this.normalizeMembers(members)
    const manager = normalized.find((m) => m.role === 'AppManager')

    await this.prisma.$transaction(async (tx) => {
      await tx.appMember.deleteMany({ where: { appId } })
      if (normalized.length) {
        await tx.appMember.createMany({
          data: normalized.map((m) => ({
            appId,
            personId: m.personId,
            role: m.role,
          })),
        })
      }
      if (manager) {
        await tx.projectApp.update({
          where: { id: appId },
          data: { ownerId: manager.personId },
        })
      }
    })

    return this.list(appId)
  }

  normalizeMembers(members: MemberInput[]): { personId: string; role: AppMemberRole }[] {
    const byPerson = new Map<string, AppMemberRole>()
    for (const m of members ?? []) {
      if (!m?.personId) continue
      const role = (APP_MEMBER_ROLES.includes(m.role as AppMemberRole)
        ? m.role
        : 'Contributor') as AppMemberRole
      // Prefer AppManager if duplicated
      const prev = byPerson.get(m.personId)
      if (!prev || role === 'AppManager') byPerson.set(m.personId, role)
    }
    const list = [...byPerson.entries()].map(([personId, role]) => ({ personId, role }))
    const managers = list.filter((m) => m.role === 'AppManager')
    if (managers.length > 1) {
      throw new BadRequestException('Only one AppManager is allowed per app')
    }
    return list
  }
}
