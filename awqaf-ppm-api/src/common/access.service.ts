import { Injectable } from '@nestjs/common'
import type { AppRole } from './capabilities'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  isFullAccess(role: AppRole) {
    return role === 'Portfolio Director'
  }

  async accessibleProjectIds(personId: string, role: AppRole): Promise<string[] | 'all'> {
    if (this.isFullAccess(role)) return 'all'
    const [managed, memberships] = await Promise.all([
      this.prisma.project.findMany({ where: { managerId: personId }, select: { id: true } }),
      this.prisma.projectMember.findMany({ where: { personId }, select: { projectId: true } }),
    ])
    return [...new Set([...managed.map((p) => p.id), ...memberships.map((m) => m.projectId)])]
  }

  async accessibleAppIds(personId: string, role: AppRole): Promise<string[] | 'all'> {
    if (this.isFullAccess(role)) return 'all'

    const [appMembers, owned] = await Promise.all([
      this.prisma.appMember.findMany({ where: { personId }, select: { appId: true } }),
      this.prisma.projectApp.findMany({ where: { ownerId: personId }, select: { id: true } }),
    ])

    // Project Managers see applications under projects they manage or belong to.
    // Developers/Business see only explicitly assigned apps (membership / ownership).
    let projectScopedAppIds: string[] = []
    if (role === 'Project Manager' || role === 'PMO Analyst') {
      const projectIds = await this.accessibleProjectIds(personId, role)
      if (projectIds !== 'all' && projectIds.length > 0) {
        projectScopedAppIds = (
          await this.prisma.projectApp.findMany({
            where: { projectId: { in: projectIds } },
            select: { id: true },
          })
        ).map((a) => a.id)
      }
    }

    return [
      ...new Set([
        ...appMembers.map((m) => m.appId),
        ...owned.map((a) => a.id),
        ...projectScopedAppIds,
      ]),
    ]
  }

  async canAccessApp(personId: string, role: AppRole, appId: string): Promise<boolean> {
    if (this.isFullAccess(role)) return true
    const app = await this.prisma.projectApp.findUnique({ where: { id: appId } })
    if (!app) return false
    if (app.ownerId === personId) return true
    const member = await this.prisma.appMember.findUnique({
      where: { appId_personId: { appId, personId } },
    })
    if (member) return true
    if (role === 'Project Manager' || role === 'PMO Analyst') {
      return this.canAccessProject(personId, role, app.projectId)
    }
    return false
  }

  async canAccessProject(personId: string, role: AppRole, projectId: string): Promise<boolean> {
    if (this.isFullAccess(role)) return true
    const project = await this.prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return false
    if (project.managerId === personId) return true
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_personId: { projectId, personId } },
    })
    return Boolean(member)
  }

  async syncPersonProjectIds(personId: string) {
    const [managed, memberships] = await Promise.all([
      this.prisma.project.findMany({ where: { managerId: personId }, select: { id: true } }),
      this.prisma.projectMember.findMany({ where: { personId }, select: { projectId: true } }),
    ])
    const projectIds = [...new Set([...managed.map((p) => p.id), ...memberships.map((m) => m.projectId)])]
    await this.prisma.person.update({
      where: { id: personId },
      data: { projectIds },
    })
    return projectIds
  }
}

export function mapJobRoleToAppRole(jobRole: string): AppRole {
  if (jobRole === 'Portfolio Director') return 'Portfolio Director'
  if (jobRole === 'Project Manager') return 'Project Manager'
  if (jobRole === 'Developer') return 'Developer'
  if (jobRole === 'Business') return 'Business'
  if (jobRole === 'PMO Analyst') return 'PMO Analyst'
  if (jobRole === 'Business Analyst') return 'Business'
  if (jobRole === 'Executive Viewer') return 'Executive Viewer'
  if (jobRole.includes('Director') || jobRole.includes('Executive')) {
    return jobRole === 'Portfolio Director' ? 'Portfolio Director' : 'Executive Viewer'
  }
  if (
    ['Lead Developer', 'Frontend Engineer', 'QA Lead', 'Solution Architect', 'UX Designer'].includes(
      jobRole,
    )
  ) {
    return 'Developer'
  }
  return 'Executive Viewer'
}

export const APP_MEMBER_ROLES = ['AppManager', 'Developer', 'Business', 'Contributor'] as const
export type AppMemberRole = (typeof APP_MEMBER_ROLES)[number]

export const TICKET_TAGS = [
  'Risk',
  'Problem',
  'NeedHelp',
  'Immediate',
  'Blocked',
  'Decision',
  'Update',
] as const
export type TicketTag = (typeof TICKET_TAGS)[number]
