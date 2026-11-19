import { http, HttpResponse } from 'msw'
import type {
  ApprovalStatus,
  Milestone,
  Person,
  Project,
  ProjectApp,
  ProjectStatus,
  Risk,
  RiskLevel,
  TaskStatus,
  WbsItem,
} from '@/data/types'
import { PERSONAS, personaById } from '@/auth/personas'
import { capabilitiesForRole } from '@/auth/permissions'
import {
  canAccessApp,
  canAccessProject,
  canAccessTicket,
  filterByProjectScope,
  resolveAccessScope,
} from '@/auth/access-scope'
import type { AppRole } from '@/auth/permissions'
import {
  addDocument,
  addTicketComment,
  addTransaction,
  createPerson,
  createProject,
  createTicket,
  decideApproval,
  deleteApp,
  deleteProject,
  deleteTask,
  getDb,
  getPerson,
  getTicket,
  listAppMembers,
  listTickets,
  markAllNotificationsRead,
  markNotificationRead,
  resetDb,
  scopedSnapshot,
  setAppAccess,
  setAppMembers,
  setProjectMembers,
  updatePerson,
  updateProject,
  updateTaskStatus,
  updateTicket,
  getAppDashboard,
  importProjectPack,
  reorderApps,
  upsertApp,
  upsertMilestone,
  upsertRisk,
  upsertTask,
} from './db'
import type { ParsedProjectPack } from '@/lib/project-pack'
import { isBlockingIssue, validateProjectPack } from '@/lib/project-pack'

function unauthorized() {
  return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
}

function forbidden(message = 'Forbidden') {
  return HttpResponse.json({ message }, { status: 403 })
}

function bearerUserId(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  // token format: mock.<personaId>.<personId>
  const parts = token.split('.')
  if (parts[0] !== 'mock' || parts.length < 3) return null
  return parts[2] ?? null
}

function bearerPersona(request: Request) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const parts = auth.slice(7).split('.')
  if (parts[0] !== 'mock' || parts.length < 3) return null
  return personaById(parts[1])
}

function requestScope(request: Request) {
  const persona = bearerPersona(request)
  const personId = bearerUserId(request)
  if (!persona || !personId) return null
  const db = getDb()
  return {
    persona,
    personId,
    role: persona.role as AppRole,
    scope: resolveAccessScope(personId, persona.role, db),
  }
}

const MOCK_TEMP_PASSWORD = 'Awqaf@2026'
const mockPasswords = new Map<string, string>()
const mustChangeByPerson = new Map<string, boolean>()

function authUserFromPerson(personId: string) {
  const persona = PERSONAS.find((p) => p.personId === personId)
  const person = getPerson(personId)
  if (!persona || !person) return null
  const mustChangePassword = mustChangeByPerson.get(personId) ?? true
  return {
    id: persona.personId,
    personaId: persona.id,
    name: person.name,
    nameAr: person.nameAr,
    email: person.email,
    username: person.email.split('@')[0] ?? persona.id,
    role: persona.role,
    capabilities: capabilitiesForRole(persona.role),
    mustChangePassword,
  }
}

function findPersonByLogin(login: string) {
  return getDb().people.find(
    (p) => p.email.toLowerCase() === login || p.email.split('@')[0]?.toLowerCase() === login,
  )
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string }
    const login = (body.username ?? '').trim().toLowerCase()
    const password = body.password ?? ''
    if (!login || !password) {
      return HttpResponse.json({ message: 'Username and password are required' }, { status: 400 })
    }
    const person = findPersonByLogin(login)
    if (!person) {
      return HttpResponse.json({ message: 'Invalid username or password' }, { status: 401 })
    }
    const expected = mockPasswords.get(person.id) ?? MOCK_TEMP_PASSWORD
    if (password !== expected) {
      return HttpResponse.json({ message: 'Invalid username or password' }, { status: 401 })
    }
    const persona = PERSONAS.find((p) => p.personId === person.id)
    if (!persona) {
      return HttpResponse.json({ message: 'Invalid username or password' }, { status: 401 })
    }
    if (!mustChangeByPerson.has(person.id)) mustChangeByPerson.set(person.id, true)
    const user = authUserFromPerson(person.id)
    const token = `mock.${persona.id}.${persona.personId}`
    return HttpResponse.json({ token, user })
  }),

  http.post('/api/auth/change-password', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string }
    const expected = mockPasswords.get(persona.personId) ?? MOCK_TEMP_PASSWORD
    if (body.currentPassword !== expected) {
      return HttpResponse.json({ message: 'Current password is incorrect' }, { status: 400 })
    }
    if (!body.newPassword || body.newPassword.length < 8) {
      return HttpResponse.json({ message: 'New password must be at least 8 characters' }, { status: 400 })
    }
    mockPasswords.set(persona.personId, body.newPassword)
    mustChangeByPerson.set(persona.personId, false)
    return HttpResponse.json(authUserFromPerson(persona.personId))
  }),

  http.get('/api/auth/me', ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    const user = authUserFromPerson(persona.personId)
    if (!user) return unauthorized()
    return HttpResponse.json(user)
  }),

  http.get('/api/auth/personas', () => HttpResponse.json(PERSONAS)),

  http.get('/api/bootstrap', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    return HttpResponse.json(scopedSnapshot(ctx.personId, ctx.role))
  }),

  http.post('/api/demo/reset', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    return HttpResponse.json(resetDb())
  }),

  http.get('/api/projects', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const rows = getDb().projects.filter((p) => canAccessProject(ctx.scope, p.id))
    return HttpResponse.json(rows)
  }),

  http.get('/api/projects/:id', ({ params, request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const project = getDb().projects.find((p) => p.id === params.id)
    if (!project || !canAccessProject(ctx.scope, project.id)) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(project)
  }),

  http.post('/api/projects', async ({ request }) => {
    const persona = bearerPersona(request)
    const actorId = bearerUserId(request)
    if (!persona || !actorId) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as {
      code: string
      name: string
      nameAr: string
      description?: string
      descriptionAr?: string
      managerId: string
      status?: ProjectStatus
      plannedStart: string
      plannedEnd: string
      phase?: string
      budgetApproved?: number
      riskLevel?: RiskLevel
      charter?: string
      charterAr?: string
    }
    if (!body.code?.trim() || !body.name?.trim() || !body.managerId || !body.plannedStart || !body.plannedEnd) {
      return HttpResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }
    const project: Project = {
      id: `prj-${Date.now()}`,
      code: body.code.trim(),
      name: body.name.trim(),
      nameAr: (body.nameAr || body.name).trim(),
      description: body.description?.trim() ?? '',
      descriptionAr: body.descriptionAr?.trim() ?? '',
      managerId: body.managerId,
      status: body.status ?? 'Planned',
      plannedProgress: 0,
      actualProgress: 0,
      plannedStart: body.plannedStart,
      plannedEnd: body.plannedEnd,
      forecastEnd: body.plannedEnd,
      phase: body.phase?.trim() || 'Initiation',
      budgetApproved: body.budgetApproved ?? 0,
      budgetAllocated: 0,
      budgetSpent: 0,
      slaCompliance: 100,
      riskLevel: body.riskLevel ?? 'Low',
      summary: '',
      summaryAr: '',
      managerUpdate: '',
      managerUpdateAr: '',
      charter: body.charter?.trim() ?? '',
      charterAr: body.charterAr?.trim() ?? '',
    }
    return HttpResponse.json(createProject(project, actorId), { status: 201 })
  }),

  http.patch('/api/projects/:id', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const patch = (await request.json()) as Partial<Project>
    const updated = updateProject(String(params.id), patch)
    if (!updated) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('/api/projects/:id', ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const result = deleteProject(String(params.id))
    if (!result) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(result)
  }),

  http.get('/api/apps', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().apps.filter((a) => canAccessApp(ctx.scope, a.id))
    if (projectId) rows = rows.filter((a) => a.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.post('/api/apps', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as Omit<ProjectApp, 'id'> & { id?: string }
    if (!body.projectId || !body.code?.trim() || !body.name?.trim()) {
      return HttpResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }
    const app: ProjectApp = {
      id: body.id || `app-${Date.now()}`,
      projectId: body.projectId,
      code: body.code.trim(),
      name: body.name.trim(),
      nameAr: (body.nameAr || body.name).trim(),
      description: body.description ?? '',
      descriptionAr: body.descriptionAr ?? '',
      ownerId: body.ownerId,
      status: body.status ?? 'Planned',
      plannedStart: body.plannedStart,
      plannedEnd: body.plannedEnd,
      url: body.url ?? '',
      userCount: body.userCount ?? 0,
      readiness: body.readiness ?? 0,
      iconColor: body.iconColor ?? '#0F766E',
      publishStatus: body.publishStatus ?? 'Draft',
      featured: Boolean(body.featured),
      sortOrder: body.sortOrder ?? getDb().apps.length + 1,
    }
    return HttpResponse.json(upsertApp(app), { status: 201 })
  }),

  http.put('/api/apps/reorder', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as { orderedIds: string[] }
    return HttpResponse.json(reorderApps(body.orderedIds ?? []))
  }),

  http.put('/api/apps/:id', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as ProjectApp
    const app: ProjectApp = { ...body, id: String(params.id) }
    return HttpResponse.json(upsertApp(app))
  }),

  http.get('/api/apps/:id/dashboard', ({ params, request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const appId = String(params.id)
    if (!canAccessApp(ctx.scope, appId)) return forbidden('Not a member of this app')
    const dash = getAppDashboard(appId)
    if (!dash) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(dash)
  }),

  http.delete('/api/apps/:id', ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    if (!deleteApp(String(params.id))) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/people', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    return HttpResponse.json(getDb().people)
  }),

  http.post('/api/people', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('admin:view')) return forbidden()
    const body = (await request.json()) as {
      name: string
      nameAr?: string
      email: string
      department?: string
      role?: string
      appRole?: string
      active?: boolean
      allocation?: number
      availability?: number
      projectIds?: string[]
    }
    if (!body.name?.trim() || !body.email?.trim()) {
      return HttpResponse.json({ message: 'Name and email are required' }, { status: 400 })
    }
    const projectIds = [...new Set((body.projectIds ?? []).filter(Boolean))]
    const person = createPerson({
      id: `p-${Date.now()}`,
      name: body.name.trim(),
      nameAr: (body.nameAr || body.name).trim(),
      email: body.email.trim().toLowerCase(),
      department: body.department?.trim() || 'General',
      role: body.role?.trim() || body.appRole || 'Executive Viewer',
      appRole: body.appRole || body.role || 'Executive Viewer',
      allocation: body.allocation ?? 100,
      availability: body.availability ?? 20,
      active: body.active ?? true,
      projectIds,
    })
    for (const projectId of projectIds) {
      const current = getDb().projectMembers[projectId] ?? []
      if (!current.includes(person.id)) {
        setProjectMembers(projectId, [...current, person.id])
      }
    }
    return HttpResponse.json(person, { status: 201 })
  }),

  http.patch('/api/people/:id', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('admin:view')) return forbidden()
    const patch = (await request.json()) as Partial<Person>
    const id = String(params.id)
    const prev = getPerson(id)
    const updated = updatePerson(id, patch)
    if (!updated) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    if (Array.isArray(patch.projectIds) && prev) {
      const nextIds = [...new Set(patch.projectIds)]
      for (const [projectId, members] of Object.entries(getDb().projectMembers)) {
        if (members.includes(id) && !nextIds.includes(projectId)) {
          setProjectMembers(
            projectId,
            members.filter((m) => m !== id),
          )
        }
      }
      for (const projectId of nextIds) {
        const current = getDb().projectMembers[projectId] ?? []
        if (!current.includes(id)) setProjectMembers(projectId, [...current, id])
      }
    }
    return HttpResponse.json(updated)
  }),

  http.get('/api/projects/:id/members', ({ params, request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const project = getDb().projects.find((p) => p.id === params.id)
    if (!project) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const memberIds = getDb().projectMembers[String(params.id)] ?? []
    const members = memberIds
      .map((id) => getDb().people.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        personId: p!.id,
        name: p!.name,
        nameAr: p!.nameAr,
        email: p!.email,
        role: p!.role,
        appRole: p!.appRole ?? p!.role,
      }))
    return HttpResponse.json({
      projectId: project.id,
      managerId: project.managerId,
      memberIds,
      members,
    })
  }),

  http.put('/api/projects/:id/members', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as { personIds: string[] }
    const project = getDb().projects.find((p) => p.id === params.id)
    if (!project) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const memberIds = setProjectMembers(String(params.id), body.personIds ?? [])
    return HttpResponse.json({
      projectId: project.id,
      managerId: project.managerId,
      memberIds,
      members: memberIds.map((id) => {
        const p = getPerson(id)!
        return {
          personId: p.id,
          name: p.name,
          nameAr: p.nameAr,
          email: p.email,
          role: p.role,
          appRole: p.appRole ?? p.role,
        }
      }),
    })
  }),

  http.get('/api/apps/:id/members', ({ params, request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const app = getDb().apps.find((a) => a.id === params.id)
    if (!app) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const members = listAppMembers(String(params.id)).map((m) => {
      const p = getPerson(m.personId)
      return {
        personId: m.personId,
        role: m.role,
        name: p?.name,
        nameAr: p?.nameAr,
        email: p?.email,
      }
    })
    return HttpResponse.json({
      appId: app.id,
      projectId: app.projectId,
      ownerId: app.ownerId,
      members,
    })
  }),

  http.put('/api/apps/:id/members', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as {
      members: Array<{ personId: string; role: string }>
    }
    const app = getDb().apps.find((a) => a.id === params.id)
    if (!app) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const members = setAppMembers(String(params.id), body.members ?? []).map((m) => {
      const p = getPerson(m.personId)
      return {
        personId: m.personId,
        role: m.role,
        name: p?.name,
        nameAr: p?.nameAr,
        email: p?.email,
      }
    })
    return HttpResponse.json({
      appId: app.id,
      projectId: app.projectId,
      ownerId: getDb().apps.find((a) => a.id === params.id)?.ownerId,
      members,
    })
  }),

  http.get('/api/apps/:id/access', ({ params, request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const app = getDb().apps.find((a) => a.id === params.id)
    if (!app) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const personIds = (getDb().appAccess[String(params.id)] ?? []).length
      ? getDb().appAccess[String(params.id)]
      : listAppMembers(String(params.id)).map((m) => m.personId)
    return HttpResponse.json({
      appId: app.id,
      projectId: app.projectId,
      personIds,
      people: personIds.map((id) => {
        const p = getPerson(id)!
        return { personId: p.id, name: p.name, nameAr: p.nameAr, email: p.email }
      }),
    })
  }),

  http.put('/api/apps/:id/access', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as { personIds: string[] }
    const app = getDb().apps.find((a) => a.id === params.id)
    if (!app) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const personIds = setAppAccess(String(params.id), body.personIds ?? [])
    return HttpResponse.json({
      appId: app.id,
      projectId: app.projectId,
      personIds,
      people: personIds.map((id) => {
        const p = getPerson(id)!
        return { personId: p.id, name: p.name, nameAr: p.nameAr, email: p.email }
      }),
    })
  }),

  http.get('/api/tickets', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    if (!capabilitiesForRole(ctx.role).includes('tasks:write')) return forbidden()
    const url = new URL(request.url)
    const rows = listTickets({
      projectId: url.searchParams.get('projectId'),
      appId: url.searchParams.get('appId'),
      assigneeId: url.searchParams.get('assigneeId'),
      status: url.searchParams.get('status'),
      tag: url.searchParams.get('tag'),
      urgency: url.searchParams.get('urgency'),
    }).filter((t) => canAccessTicket(ctx.scope, t))
    return HttpResponse.json(rows)
  }),

  http.get('/api/tickets/:id', ({ params, request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    if (!capabilitiesForRole(ctx.role).includes('tasks:write')) return forbidden()
    const ticket = getTicket(String(params.id))
    if (!ticket || !canAccessTicket(ctx.scope, ticket)) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(ticket)
  }),

  http.post('/api/tickets', async ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    if (!capabilitiesForRole(ctx.role).includes('tasks:write')) return forbidden()
    const body = (await request.json()) as {
      projectId: string
      appId?: string
      type: string
      status?: string
      priority?: string
      urgency?: string
      tags?: string[]
      title: string
      titleAr?: string
      body?: string
      bodyAr?: string
      assigneeId?: string
    }
    if (!canAccessProject(ctx.scope, body.projectId)) return forbidden('Not a member of this project')
    if (body.appId && !canAccessApp(ctx.scope, body.appId)) return forbidden('Not a member of this app')
    const ticket = createTicket({
      projectId: body.projectId,
      appId: body.appId,
      type: body.type || 'Task',
      status: body.status ?? 'Open',
      priority: body.priority ?? 'Medium',
      urgency: body.urgency ?? 'Normal',
      tags: body.tags ?? [],
      title: body.title,
      titleAr: body.titleAr || body.title,
      body: body.body ?? '',
      bodyAr: body.bodyAr ?? '',
      reporterId: ctx.personId,
      assigneeId: body.assigneeId,
    })
    return HttpResponse.json(ticket, { status: 201 })
  }),

  http.patch('/api/tickets/:id', async ({ params, request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    if (!capabilitiesForRole(ctx.role).includes('tasks:write')) return forbidden()
    const existing = getTicket(String(params.id))
    if (!existing || !canAccessTicket(ctx.scope, existing)) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json()) as Partial<import('@/data/types').Ticket>
    const updated = updateTicket(String(params.id), body)
    if (!updated) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.post('/api/tickets/:id/comments', async ({ params, request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    if (!capabilitiesForRole(ctx.role).includes('tasks:write')) return forbidden()
    const existing = getTicket(String(params.id))
    if (!existing || !canAccessTicket(ctx.scope, existing)) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json()) as { body: string }
    const updated = addTicketComment(String(params.id), ctx.personId, body.body)
    if (!updated) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.get('/api/wbs', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = filterByProjectScope(ctx.scope, getDb().wbs)
    if (projectId) rows = rows.filter((w) => w.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.put('/api/wbs/:id', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('tasks:write')) return forbidden()
    const task = (await request.json()) as WbsItem
    return HttpResponse.json(upsertTask(task, persona.personId))
  }),

  http.post('/api/wbs', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('tasks:write')) return forbidden()
    const task = (await request.json()) as WbsItem
    return HttpResponse.json(upsertTask(task, persona.personId))
  }),

  http.patch('/api/wbs/:id/status', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('tasks:write')) return forbidden()
    const body = (await request.json()) as { status: TaskStatus }
    const updated = updateTaskStatus(String(params.id), body.status)
    if (!updated) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('/api/wbs/:id', ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('tasks:write')) return forbidden()
    if (!deleteTask(String(params.id))) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/milestones', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = filterByProjectScope(ctx.scope, getDb().milestones)
    if (projectId) rows = rows.filter((m) => m.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.put('/api/milestones/:id', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('milestones:write')) return forbidden()
    const m = (await request.json()) as Milestone
    return HttpResponse.json(upsertMilestone(m))
  }),

  http.get('/api/slas', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = filterByProjectScope(ctx.scope, getDb().slas)
    if (projectId) rows = rows.filter((s) => s.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.get('/api/risks', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = filterByProjectScope(ctx.scope, getDb().risks)
    if (projectId) rows = rows.filter((r) => r.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.put('/api/risks/:id', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('risks:write')) return forbidden()
    const risk = (await request.json()) as Risk
    return HttpResponse.json(upsertRisk(risk))
  }),

  http.post('/api/risks', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('risks:write')) return forbidden()
    const risk = (await request.json()) as Risk
    return HttpResponse.json(upsertRisk(risk))
  }),

  http.get('/api/transactions', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = filterByProjectScope(ctx.scope, getDb().transactions)
    if (projectId) rows = rows.filter((t) => t.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.post('/api/transactions', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('budget:adjust')) return forbidden()
    const tx = (await request.json()) as Parameters<typeof addTransaction>[0]
    return HttpResponse.json(addTransaction(tx))
  }),

  http.get('/api/approvals', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = filterByProjectScope(ctx.scope, getDb().approvals)
    if (projectId) rows = rows.filter((a) => a.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.post('/api/approvals/:id/decide', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('approvals:decide')) return forbidden()
    const body = (await request.json()) as {
      status: Exclude<ApprovalStatus, 'Pending'>
      comment?: string
    }
    if (body.status === 'Rejected' && !body.comment?.trim()) {
      return HttpResponse.json({ message: 'Comment required on reject' }, { status: 400 })
    }
    const updated = decideApproval(String(params.id), body.status, persona.personId, body.comment)
    if (!updated) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.get('/api/documents', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = filterByProjectScope(ctx.scope, getDb().documents)
    if (projectId) rows = rows.filter((d) => d.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.post('/api/documents', async ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    if (!capabilitiesForRole(ctx.role).includes('documents:upload')) return forbidden()
    const body = (await request.json()) as {
      projectId: string
      name: string
      category: string
      size?: string
      version?: string
    }
    if (!canAccessProject(ctx.scope, body.projectId)) return forbidden('Not a member of this project')
    const doc = addDocument({
      id: `doc-${Date.now()}`,
      projectId: body.projectId,
      name: body.name,
      category: body.category,
      uploadedBy: ctx.personId,
      uploadedAt: new Date().toISOString().slice(0, 10),
      size: body.size ?? '0 KB',
      version: body.version ?? '1.0',
    })
    return HttpResponse.json(doc)
  }),

  http.get('/api/activities', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = filterByProjectScope(ctx.scope, getDb().activities)
    if (projectId) rows = rows.filter((a) => a.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.get('/api/notifications', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const rows = getDb().notifications.filter((n) => {
      if (ctx.scope.mode === 'all') {
        return !n.recipientId || n.recipientId === ctx.personId
      }
      if (n.recipientId) return n.recipientId === ctx.personId
      if (n.appId) return canAccessApp(ctx.scope, n.appId)
      if (n.projectId) return canAccessProject(ctx.scope, n.projectId)
      return false
    })
    return HttpResponse.json(rows)
  }),

  http.post('/api/notifications/:id/read', ({ params, request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    const existing = getDb().notifications.find((n) => n.id === params.id)
    if (!existing) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    if (existing.recipientId && existing.recipientId !== ctx.personId) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const n = markNotificationRead(String(params.id))
    if (!n) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(n)
  }),

  http.post('/api/notifications/read-all', ({ request }) => {
    const ctx = requestScope(request)
    if (!ctx) return unauthorized()
    return HttpResponse.json(markAllNotificationsRead(ctx.personId))
  }),

  http.post('/api/import/project-pack', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as { pack: ParsedProjectPack }
    if (!body?.pack?.project) {
      return HttpResponse.json({ message: 'Invalid pack payload' }, { status: 400 })
    }
    const issues = validateProjectPack(body.pack, { people: getDb().people })
    const blocking = issues.filter(isBlockingIssue)
    if (blocking.length) {
      return HttpResponse.json({ ok: false, issues: blocking }, { status: 400 })
    }
    const actorId = bearerUserId(request) ?? persona.personId
    const summary = importProjectPack(body.pack, actorId)
    return HttpResponse.json({ ok: true, summary, warnings: issues.filter((i) => !isBlockingIssue(i)) })
  }),
]
