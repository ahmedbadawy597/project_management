import type { AppRole } from './permissions'
import type { ProjectApp, Ticket } from '@/data/types'

export type MembershipMaps = {
  projects: Array<{ id: string; managerId?: string }>
  /** Optional to match DomainState / older bootstrap payloads. */
  apps?: Array<{ id: string; projectId: string; ownerId?: string }>
  projectMembers?: Record<string, string[]>
  appMembers?: Record<string, Array<{ personId: string; role: string }>>
  appAccess?: Record<string, string[]>
  people?: Array<{ id: string; projectIds?: string[] }>
}

export type AccessScope = {
  /** Full portfolio access (admin / PMO / executive). */
  mode: 'all' | 'scoped'
  projectIds: Set<string>
  appIds: Set<string>
}

/** Roles that see the whole portfolio without membership filters. */
export function isGlobalAccessRole(role: AppRole): boolean {
  return (
    role === 'Portfolio Director' ||
    role === 'Project Manager' ||
    role === 'PMO Analyst' ||
    role === 'Executive Viewer'
  )
}

/** Delivery roles limited to joined projects/apps. */
export function isMembershipScopedRole(role: AppRole): boolean {
  return role === 'Developer' || role === 'Business'
}

export function resolveAccessScope(
  personId: string,
  role: AppRole,
  maps: MembershipMaps,
): AccessScope {
  const apps = maps.apps ?? []
  const projects = maps.projects ?? []

  if (isGlobalAccessRole(role)) {
    return {
      mode: 'all',
      projectIds: new Set(projects.map((p) => p.id)),
      appIds: new Set(apps.map((a) => a.id)),
    }
  }

  const projectIds = new Set<string>()
  const appIds = new Set<string>()

  const person = maps.people?.find((p) => p.id === personId)
  for (const id of person?.projectIds ?? []) projectIds.add(id)

  for (const [projectId, members] of Object.entries(maps.projectMembers ?? {})) {
    if (members.includes(personId)) projectIds.add(projectId)
  }

  for (const project of projects) {
    if (project.managerId === personId) projectIds.add(project.id)
  }

  for (const [appId, members] of Object.entries(maps.appMembers ?? {})) {
    if (members.some((m) => m.personId === personId)) appIds.add(appId)
  }

  for (const [appId, ids] of Object.entries(maps.appAccess ?? {})) {
    if (ids.includes(personId)) appIds.add(appId)
  }

  for (const app of apps) {
    if (app.ownerId === personId) appIds.add(app.id)
  }

  // Parent projects of joined apps are visible for context (milestones / risks / chats).
  for (const app of apps) {
    if (appIds.has(app.id)) projectIds.add(app.projectId)
  }

  return { mode: 'scoped', projectIds, appIds }
}

export function canAccessProject(scope: AccessScope, projectId: string | undefined | null): boolean {
  if (!projectId) return scope.mode === 'all'
  if (scope.mode === 'all') return true
  return scope.projectIds.has(projectId)
}

export function canAccessApp(scope: AccessScope, appId: string | undefined | null): boolean {
  if (!appId) return true
  if (scope.mode === 'all') return true
  return scope.appIds.has(appId)
}

/** Tickets: joined app when app-linked; otherwise joined project. */
export function canAccessTicket(
  scope: AccessScope,
  ticket: Pick<Ticket, 'projectId' | 'appId'>,
): boolean {
  if (scope.mode === 'all') return true
  if (ticket.appId) {
    return scope.appIds.has(ticket.appId) && scope.projectIds.has(ticket.projectId)
  }
  return scope.projectIds.has(ticket.projectId)
}

export function filterAppsByScope<T extends ProjectApp>(scope: AccessScope, apps: T[]): T[] {
  if (scope.mode === 'all') return apps
  return apps.filter((a) => scope.appIds.has(a.id))
}

export function filterProjectsByScope<T extends { id: string }>(
  scope: AccessScope,
  projects: T[],
): T[] {
  if (scope.mode === 'all') return projects
  return projects.filter((p) => scope.projectIds.has(p.id))
}

export function filterByProjectScope<T extends { projectId: string }>(
  scope: AccessScope,
  rows: T[],
): T[] {
  if (scope.mode === 'all') return rows
  return rows.filter((r) => scope.projectIds.has(r.projectId))
}
