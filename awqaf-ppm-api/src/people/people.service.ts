import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { mapJobRoleToAppRole } from '../common/access.service'
import type { AppRole } from '../common/capabilities'
import { mapPerson } from '../common/mappers'
import {
  DEFAULT_TEMP_PASSWORD,
  hashPassword,
  usernameFromEmail,
} from '../auth/password.util'
import { PrismaService } from '../prisma/prisma.service'

const APP_ROLES: AppRole[] = [
  'Portfolio Director',
  'Project Manager',
  'Developer',
  'Business',
  'PMO Analyst',
  'Executive Viewer',
]

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.person.findMany({ orderBy: { name: 'asc' } })
    return rows.map(mapPerson)
  }

  async create(body: {
    name: string
    nameAr?: string
    email: string
    department?: string
    role?: string
    appRole?: string
    allocation?: number
    availability?: number
    active?: boolean
    projectIds?: string[]
  }) {
    if (!body.name?.trim() || !body.email?.trim()) {
      throw new BadRequestException('Name and email are required')
    }
    const email = body.email.trim().toLowerCase()
    const existing = await this.prisma.person.findFirst({ where: { email } })
    if (existing) throw new BadRequestException('Email already in use')

    const jobRole = body.role?.trim() || body.appRole || 'Executive Viewer'
    const appRole = APP_ROLES.includes(body.appRole as AppRole)
      ? (body.appRole as AppRole)
      : mapJobRoleToAppRole(jobRole)

    const projectIds = [...new Set((body.projectIds ?? []).filter(Boolean))]
    if (projectIds.length) {
      const found = await this.prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true },
      })
      if (found.length !== projectIds.length) {
        throw new BadRequestException('One or more projects were not found')
      }
    }

    const username = usernameFromEmail(email)
    const usernameTaken = await this.prisma.person.findFirst({ where: { username } })
    if (usernameTaken) throw new BadRequestException('Username already in use')

    const id = `p-${Date.now()}`
    const passwordHash = await hashPassword(DEFAULT_TEMP_PASSWORD)
    const row = await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          id,
          name: body.name.trim(),
          nameAr: (body.nameAr || body.name).trim(),
          email,
          username,
          passwordHash,
          mustChangePassword: true,
          department: body.department?.trim() || 'General',
          role: jobRole,
          appRole,
          allocation: body.allocation ?? 100,
          availability: body.availability ?? 20,
          active: body.active ?? true,
          projectIds,
        },
      })
      if (projectIds.length) {
        await tx.projectMember.createMany({
          data: projectIds.map((projectId) => ({ projectId, personId: id })),
        })
      }
      return person
    })
    return mapPerson(row)
  }

  async update(
    id: string,
    body: Partial<{
      name: string
      nameAr: string
      email: string
      department: string
      role: string
      appRole: string
      allocation: number
      availability: number
      active: boolean
      projectIds: string[]
    }>,
  ) {
    const existing = await this.prisma.person.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Not found')

    if (body.email) {
      const email = body.email.trim().toLowerCase()
      const clash = await this.prisma.person.findFirst({
        where: { email, NOT: { id } },
      })
      if (clash) throw new BadRequestException('Email already in use')
    }

    const appRole =
      body.appRole && APP_ROLES.includes(body.appRole as AppRole)
        ? body.appRole
        : body.role
          ? mapJobRoleToAppRole(body.role)
          : undefined

    const syncProjects = Array.isArray(body.projectIds)
    const projectIds = syncProjects
      ? [...new Set(body.projectIds!.filter(Boolean))]
      : undefined

    if (projectIds?.length) {
      const found = await this.prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true },
      })
      if (found.length !== projectIds.length) {
        throw new BadRequestException('One or more projects were not found')
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      let nextProjectIds = projectIds

      if (syncProjects && projectIds) {
        const managed = await tx.project.findMany({
          where: { managerId: id },
          select: { id: true },
        })
        nextProjectIds = [...new Set([...projectIds, ...managed.map((p) => p.id)])]
        await tx.projectMember.deleteMany({ where: { personId: id } })
        if (nextProjectIds.length) {
          await tx.projectMember.createMany({
            data: nextProjectIds.map((projectId) => ({ projectId, personId: id })),
          })
        }
      }

      return tx.person.update({
        where: { id },
        data: {
          name: body.name?.trim(),
          nameAr: body.nameAr?.trim(),
          email: body.email?.trim().toLowerCase(),
          department: body.department?.trim(),
          role: body.role?.trim(),
          appRole,
          allocation: body.allocation,
          availability: body.availability,
          active: body.active,
          ...(syncProjects ? { projectIds: nextProjectIds } : {}),
        },
      })
    })

    return mapPerson(row)
  }
}
