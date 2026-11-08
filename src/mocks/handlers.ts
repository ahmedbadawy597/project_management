import { http, HttpResponse } from 'msw'
import type {
  ApprovalStatus,
  Milestone,
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
  addDocument,
  addTransaction,
  createProject,
  decideApproval,
  deleteApp,
  deleteTask,
  getDb,
  getPerson,
  markAllNotificationsRead,
  markNotificationRead,
  resetDb,
  snapshot,
  updateProject,
  updateTaskStatus,
  upsertApp,
  upsertMilestone,
  upsertRisk,
  upsertTask,
} from './db'

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

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { personaId?: string }
    const persona = personaById(body.personaId ?? '')
    if (!persona) {
      return HttpResponse.json({ message: 'Unknown persona' }, { status: 400 })
    }
    const person = getPerson(persona.personId)
    const token = `mock.${persona.id}.${persona.personId}`
    return HttpResponse.json({
      token,
      user: {
        id: persona.personId,
        personaId: persona.id,
        name: person?.name ?? persona.label,
        nameAr: person?.nameAr ?? persona.labelAr,
        email: person?.email ?? '',
        role: persona.role,
        capabilities: capabilitiesForRole(persona.role),
      },
    })
  }),

  http.get('/api/auth/me', ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    const person = getPerson(persona.personId)
    return HttpResponse.json({
      id: persona.personId,
      personaId: persona.id,
      name: person?.name ?? persona.label,
      nameAr: person?.nameAr ?? persona.labelAr,
      email: person?.email ?? '',
      role: persona.role,
      capabilities: capabilitiesForRole(persona.role),
    })
  }),

  http.get('/api/auth/personas', () => HttpResponse.json(PERSONAS)),

  http.get('/api/bootstrap', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    return HttpResponse.json(snapshot())
  }),

  http.post('/api/demo/reset', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    return HttpResponse.json(resetDb())
  }),

  http.get('/api/projects', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    return HttpResponse.json(getDb().projects)
  }),

  http.get('/api/projects/:id', ({ params, request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const project = getDb().projects.find((p) => p.id === params.id)
    if (!project) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
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

  http.get('/api/apps', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().apps
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
    }
    return HttpResponse.json(upsertApp(app), { status: 201 })
  }),

  http.put('/api/apps/:id', async ({ params, request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('projects:write')) return forbidden()
    const body = (await request.json()) as ProjectApp
    const app: ProjectApp = { ...body, id: String(params.id) }
    return HttpResponse.json(upsertApp(app))
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

  http.get('/api/wbs', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().wbs
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
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().milestones
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
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().slas
    if (projectId) rows = rows.filter((s) => s.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.get('/api/risks', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().risks
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
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().transactions
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
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().approvals
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
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().documents
    if (projectId) rows = rows.filter((d) => d.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.post('/api/documents', async ({ request }) => {
    const persona = bearerPersona(request)
    if (!persona) return unauthorized()
    if (!capabilitiesForRole(persona.role).includes('documents:upload')) return forbidden()
    const body = (await request.json()) as {
      projectId: string
      name: string
      category: string
      size?: string
      version?: string
    }
    const doc = addDocument({
      id: `doc-${Date.now()}`,
      projectId: body.projectId,
      name: body.name,
      category: body.category,
      uploadedBy: persona.personId,
      uploadedAt: new Date().toISOString().slice(0, 10),
      size: body.size ?? '0 KB',
      version: body.version ?? '1.0',
    })
    return HttpResponse.json(doc)
  }),

  http.get('/api/activities', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    let rows = getDb().activities
    if (projectId) rows = rows.filter((a) => a.projectId === projectId)
    return HttpResponse.json(rows)
  }),

  http.get('/api/notifications', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    return HttpResponse.json(getDb().notifications)
  }),

  http.post('/api/notifications/:id/read', ({ params, request }) => {
    if (!bearerUserId(request)) return unauthorized()
    const n = markNotificationRead(String(params.id))
    if (!n) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(n)
  }),

  http.post('/api/notifications/read-all', ({ request }) => {
    if (!bearerUserId(request)) return unauthorized()
    return HttpResponse.json(markAllNotificationsRead())
  }),
]
