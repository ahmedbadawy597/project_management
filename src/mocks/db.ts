import { seedState } from '@/data/seed'
import {
  canAccessTicket,
  filterByProjectScope,
  resolveAccessScope,
} from '@/auth/access-scope'
import type { AppRole } from '@/auth/permissions'
import type {
  ActivityItem,
  AppMemberRole,
  Approval,
  ApprovalStatus,
  BudgetTransaction,
  DocumentItem,
  Milestone,
  NotificationItem,
  Person,
  Project,
  ProjectApp,
  Risk,
  SlaRecord,
  TaskStatus,
  Ticket,
  TicketComment,
  WbsItem,
} from '@/data/types'

const STORAGE_KEY = 'awqaf-ppm-mock-db-v4-access-scope'

export interface MockDb {
  projects: Project[]
  people: Person[]
  wbs: WbsItem[]
  milestones: Milestone[]
  slas: SlaRecord[]
  risks: Risk[]
  transactions: BudgetTransaction[]
  approvals: Approval[]
  documents: DocumentItem[]
  activities: ActivityItem[]
  notifications: NotificationItem[]
  apps: ProjectApp[]
  projectMembers: Record<string, string[]>
  appMembers: Record<string, Array<{ personId: string; role: AppMemberRole }>>
  /** @deprecated derived from appMembers */
  appAccess: Record<string, string[]>
  tickets: Ticket[]
}

/** Official starter app teams so developers only see apps they joined. */
function defaultAppTeams(
  apps: ProjectApp[],
): Record<string, Array<{ personId: string; role: AppMemberRole }>> {
  const byCode: Record<string, Array<{ personId: string; role: AppMemberRole }>> = {
    'KPI-STRATEGIC': [
      { personId: 'p-pm1', role: 'AppManager' },
      { personId: 'p-dev1', role: 'Developer' },
      { personId: 'p-dev2', role: 'Developer' },
    ],
    TRANSFER: [
      { personId: 'p-pm2', role: 'AppManager' },
      { personId: 'p-dev3', role: 'Developer' },
      { personId: 'p-dev4', role: 'Developer' },
    ],
    'QURAN-CONTEST': [
      { personId: 'p-pm3', role: 'AppManager' },
      { personId: 'p-dev5', role: 'Developer' },
      { personId: 'p-dev1', role: 'Developer' },
    ],
    'SMART-MOSQUES': [
      { personId: 'p-pm1', role: 'AppManager' },
      { personId: 'p-dev6', role: 'Developer' },
      { personId: 'p-dev2', role: 'Developer' },
    ],
  }
  const appMembers: Record<string, Array<{ personId: string; role: AppMemberRole }>> = {}
  for (const app of apps) {
    appMembers[app.id] = structuredClone(byCode[app.code] ?? [])
  }
  return appMembers
}

function buildMembersAndAccess(people: Person[], projects: Project[], apps: ProjectApp[]) {
  const projectMembers: Record<string, string[]> = {}
  for (const p of people) {
    for (const projectId of p.projectIds) {
      projectMembers[projectId] ??= []
      if (!projectMembers[projectId].includes(p.id)) projectMembers[projectId].push(p.id)
    }
  }
  for (const project of projects) {
    projectMembers[project.id] ??= []
    if (!projectMembers[project.id].includes(project.managerId)) {
      projectMembers[project.id].push(project.managerId)
    }
  }
  const appMembers = defaultAppTeams(apps)
  const appAccess: Record<string, string[]> = {}
  for (const app of apps) {
    appAccess[app.id] = (appMembers[app.id] ?? []).map((m) => m.personId)
    const manager = (appMembers[app.id] ?? []).find((m) => m.role === 'AppManager')
    if (manager && !app.ownerId) app.ownerId = manager.personId
  }
  return { projectMembers, appMembers, appAccess }
}

function appTeamsAreEmpty(appMembers: MockDb['appMembers'] | undefined, apps: ProjectApp[]) {
  if (!appMembers) return true
  return apps.every((app) => !(appMembers[app.id]?.length))
}

/** No fabricated tickets — team creates real collaboration items. */
function seedTickets(): Ticket[] {
  return []
}

function cloneSeed(): MockDb {
  const people = structuredClone(seedState.people).map((p) => ({
    ...p,
    active: true,
    appRole: p.role,
  }))
  const projects = structuredClone(seedState.projects)
  const apps = structuredClone(seedState.apps)
  const { projectMembers, appMembers, appAccess } = buildMembersAndAccess(people, projects, apps)
  return {
    projects,
    people,
    wbs: structuredClone(seedState.wbs),
    milestones: structuredClone(seedState.milestones),
    slas: structuredClone(seedState.slas),
    risks: structuredClone(seedState.risks),
    transactions: structuredClone(seedState.transactions),
    approvals: structuredClone(seedState.approvals),
    documents: structuredClone(seedState.documents),
    activities: structuredClone(seedState.activities),
    notifications: structuredClone(seedState.notifications),
    apps,
    projectMembers,
    appMembers,
    appAccess,
    tickets: seedTickets(),
  }
}

let db: MockDb = load()

/** Keep in-memory DB aligned with localStorage updates from other tabs. */
export function syncFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    db = hydrate(JSON.parse(raw) as MockDb)
  } catch {
    /* ignore */
  }
}

function hydrate(parsed: MockDb): MockDb {
  if (!Array.isArray(parsed.apps)) parsed.apps = structuredClone(seedState.apps)
  parsed.milestones = (parsed.milestones ?? []).map((m) => ({
    ...m,
    deliverablesAr: Array.isArray(m.deliverablesAr) ? m.deliverablesAr : m.deliverables ?? [],
  }))
  parsed.people = (parsed.people ?? []).map((p) => ({
    ...p,
    active: p.active !== false,
    appRole: p.appRole ?? p.role,
  }))
  if (!parsed.projectMembers || !parsed.appAccess || !parsed.appMembers) {
    const built = buildMembersAndAccess(parsed.people, parsed.projects, parsed.apps)
    parsed.projectMembers = parsed.projectMembers ?? built.projectMembers
    parsed.appMembers = parsed.appMembers ?? built.appMembers
    parsed.appAccess = parsed.appAccess ?? built.appAccess
  }
  if (appTeamsAreEmpty(parsed.appMembers, parsed.apps)) {
    const seeded = defaultAppTeams(parsed.apps)
    parsed.appMembers = seeded
    parsed.appAccess = Object.fromEntries(
      Object.entries(seeded).map(([id, members]) => [id, members.map((m) => m.personId)]),
    )
    for (const app of parsed.apps) {
      const manager = seeded[app.id]?.find((m) => m.role === 'AppManager')
      if (manager && !app.ownerId) app.ownerId = manager.personId
    }
  }
  if (!Array.isArray(parsed.tickets)) parsed.tickets = seedTickets()
  return parsed
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) syncFromStorage()
  })
}

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return hydrate(JSON.parse(raw) as MockDb)
  } catch {
    /* ignore */
  }
  return cloneSeed()
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function getDb(): MockDb {
  syncFromStorage()
  return db
}

export function resetDb(): MockDb {
  db = cloneSeed()
  persist()
  return db
}

export function snapshot(): MockDb {
  return structuredClone(db)
}

export function scopedSnapshot(personId: string, role: AppRole): MockDb {
  const full = snapshot()
  const scope = resolveAccessScope(personId, role, full)
  if (scope.mode === 'all') return full

  const projects = full.projects.filter((p) => scope.projectIds.has(p.id))
  const apps = full.apps.filter((a) => scope.appIds.has(a.id))
  const projectMembers: Record<string, string[]> = {}
  const appMembers: MockDb['appMembers'] = {}
  const appAccess: Record<string, string[]> = {}
  for (const p of projects) {
    projectMembers[p.id] = full.projectMembers[p.id] ?? []
  }
  for (const a of apps) {
    appMembers[a.id] = full.appMembers[a.id] ?? []
    appAccess[a.id] = full.appAccess[a.id] ?? []
  }

  return {
    ...full,
    projects,
    apps,
    projectMembers,
    appMembers,
    appAccess,
    wbs: filterByProjectScope(scope, full.wbs),
    milestones: filterByProjectScope(scope, full.milestones),
    slas: filterByProjectScope(scope, full.slas),
    risks: filterByProjectScope(scope, full.risks),
    transactions: filterByProjectScope(scope, full.transactions),
    approvals: filterByProjectScope(scope, full.approvals),
    documents: filterByProjectScope(scope, full.documents),
    activities: filterByProjectScope(scope, full.activities),
    tickets: full.tickets.filter((t) => canAccessTicket(scope, t)),
    notifications: full.notifications.filter((n) => {
      if (n.recipientId) return n.recipientId === personId
      if (n.appId) return scope.appIds.has(n.appId)
      if (n.projectId) return scope.projectIds.has(n.projectId)
      return false
    }),
  }
}

function ticketNotifyTargets(ticket: Ticket, authorId: string): string[] {
  const targets = new Set<string>()
  if (ticket.appId) {
    for (const m of db.appMembers[ticket.appId] ?? []) {
      if (m.personId !== authorId) targets.add(m.personId)
    }
  } else {
    for (const pid of db.projectMembers[ticket.projectId] ?? []) {
      if (pid !== authorId) targets.add(pid)
    }
  }
  if (ticket.reporterId && ticket.reporterId !== authorId) targets.add(ticket.reporterId)
  if (ticket.assigneeId && ticket.assigneeId !== authorId) targets.add(ticket.assigneeId)
  return [...targets]
}

function pushScopedNotifications(
  partial: Omit<NotificationItem, 'id' | 'read'> & { recipientIds: string[] },
) {
  const { recipientIds, ...rest } = partial
  for (const recipientId of recipientIds) {
    db.notifications.unshift({
      id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...rest,
      recipientId,
      read: false,
    })
  }
}

export function createPerson(input: Person): Person {
  db.people.unshift(input)
  persist()
  return input
}

export function updatePerson(id: string, patch: Partial<Person>): Person | null {
  const idx = db.people.findIndex((p) => p.id === id)
  if (idx < 0) return null
  db.people[idx] = { ...db.people[idx], ...patch, id }
  persist()
  return db.people[idx]
}

export function setProjectMembers(projectId: string, personIds: string[]) {
  db.projectMembers[projectId] = [...new Set(personIds)]
  for (const person of db.people) {
    const inTeam = personIds.includes(person.id)
    const has = person.projectIds.includes(projectId)
    if (inTeam && !has) person.projectIds = [...person.projectIds, projectId]
    if (!inTeam && has) person.projectIds = person.projectIds.filter((id) => id !== projectId)
  }
  persist()
  return db.projectMembers[projectId]
}

export function setAppAccess(appId: string, personIds: string[]) {
  return setAppMembers(
    appId,
    personIds.map((personId) => ({ personId, role: 'Contributor' as AppMemberRole })),
  ).map((m) => m.personId)
}

export function setAppMembers(
  appId: string,
  members: Array<{ personId: string; role: AppMemberRole | string }>,
) {
  const byPerson = new Map<string, AppMemberRole>()
  for (const m of members) {
    if (!m.personId) continue
    const role = (
      ['AppManager', 'Developer', 'Business', 'Contributor'].includes(m.role)
        ? m.role
        : 'Contributor'
    ) as AppMemberRole
    const prev = byPerson.get(m.personId)
    if (!prev || role === 'AppManager') byPerson.set(m.personId, role)
  }
  const list = [...byPerson.entries()].map(([personId, role]) => ({ personId, role }))
  db.appMembers[appId] = list
  db.appAccess[appId] = list.map((m) => m.personId)
  const manager = list.find((m) => m.role === 'AppManager')
  if (manager) {
    const app = db.apps.find((a) => a.id === appId)
    if (app) app.ownerId = manager.personId
  }
  persist()
  return list
}

export function listAppMembers(appId: string) {
  return db.appMembers[appId] ?? []
}

export function listTickets(filters: {
  projectId?: string | null
  appId?: string | null
  assigneeId?: string | null
  status?: string | null
  tag?: string | null
  urgency?: string | null
}) {
  let rows = [...db.tickets]
  if (filters.projectId) rows = rows.filter((t) => t.projectId === filters.projectId)
  if (filters.appId) rows = rows.filter((t) => t.appId === filters.appId)
  if (filters.assigneeId) rows = rows.filter((t) => t.assigneeId === filters.assigneeId)
  if (filters.status) rows = rows.filter((t) => t.status === filters.status)
  if (filters.urgency) rows = rows.filter((t) => t.urgency === filters.urgency)
  if (filters.tag) rows = rows.filter((t) => (t.tags as string[]).includes(filters.tag!))
  return rows.map(({ comments, ...rest }) => ({
    ...rest,
    commentCount: comments?.length ?? rest.commentCount ?? 0,
  }))
}

export function getTicket(id: string) {
  return db.tickets.find((t) => t.id === id) ?? null
}

export function createTicket(
  input: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'commentCount'> & {
    reporterId: string
  },
): Ticket {
  const now = new Date().toISOString()
  const tags = [...(input.tags ?? [])]
  if (input.urgency === 'Immediate' && !tags.includes('Immediate')) tags.push('Immediate')
  const ticket: Ticket = {
    ...input,
    id: `tkt-${Date.now()}`,
    tags,
    createdAt: now,
    updatedAt: now,
    comments: [],
    commentCount: 0,
  }
  db.tickets.unshift(ticket)
  if (input.urgency === 'Immediate') {
    pushScopedNotifications({
      recipientIds: ticketNotifyTargets(ticket, input.reporterId),
      title: 'Immediate ticket',
      titleAr: 'تذكرة عاجلة',
      body: ticket.title,
      bodyAr: ticket.titleAr,
      at: now,
      href: `/tickets?id=${ticket.id}`,
      projectId: ticket.projectId,
      appId: ticket.appId,
    })
  }
  persist()
  return ticket
}

export function updateTicket(id: string, patch: Partial<Ticket>): Ticket | null {
  const idx = db.tickets.findIndex((t) => t.id === id)
  if (idx < 0) return null
  const current = db.tickets[idx]
  const next = {
    ...current,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
    comments: current.comments,
  }
  if (next.urgency === 'Immediate' && !next.tags.includes('Immediate')) {
    next.tags = [...next.tags, 'Immediate']
  }
  db.tickets[idx] = next
  persist()
  return next
}

export function addTicketComment(id: string, authorId: string, body: string): Ticket | null {
  syncFromStorage()
  const ticket = db.tickets.find((t) => t.id === id)
  if (!ticket) return null
  const comment: TicketComment = {
    id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ticketId: id,
    authorId,
    body,
    createdAt: new Date().toISOString(),
  }
  ticket.comments = [...(ticket.comments ?? []), comment]
  ticket.commentCount = ticket.comments.length
  ticket.updatedAt = comment.createdAt

  const author = db.people.find((p) => p.id === authorId)
  pushScopedNotifications({
    recipientIds: ticketNotifyTargets(ticket, authorId),
    title: 'New chat message',
    titleAr: 'رسالة جديدة في المحادثة',
    body: `${author?.name ?? 'Team'}: ${body.slice(0, 120)}`,
    bodyAr: `${author?.nameAr ?? author?.name ?? 'الفريق'}: ${body.slice(0, 120)}`,
    at: comment.createdAt,
    href: `/tickets?id=${ticket.id}`,
    projectId: ticket.projectId,
    appId: ticket.appId,
  })

  persist()
  return ticket
}

function pushActivity(partial: Omit<ActivityItem, 'id' | 'at'> & { at?: string }) {
  db.activities.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: partial.at ?? new Date().toISOString(),
    projectId: partial.projectId,
    type: partial.type,
    title: partial.title,
    titleAr: partial.titleAr,
    actorId: partial.actorId,
  })
}

export function updateProject(id: string, patch: Partial<Project>): Project | null {
  const idx = db.projects.findIndex((p) => p.id === id)
  if (idx < 0) return null
  const prev = db.projects[idx]
  const next = { ...prev, ...patch, id }
  db.projects[idx] = next
  if (patch.managerId && patch.managerId !== prev.managerId) {
    syncManagerAssignment(prev.managerId, patch.managerId, id)
  }
  persist()
  return next
}

export function createProject(input: Project, actorId: string): Project {
  db.projects.unshift(input)
  syncManagerAssignment(undefined, input.managerId, input.id)
  pushActivity({
    projectId: input.id,
    type: 'status',
    title: `Project created: ${input.name}`,
    titleAr: `تم إنشاء المشروع: ${input.nameAr}`,
    actorId,
  })
  persist()
  return input
}

function syncManagerAssignment(prevManagerId: string | undefined, nextManagerId: string, projectId: string) {
  if (prevManagerId) {
    const prev = db.people.find((p) => p.id === prevManagerId)
    if (prev) prev.projectIds = prev.projectIds.filter((id) => id !== projectId)
  }
  const next = db.people.find((p) => p.id === nextManagerId)
  if (next && !next.projectIds.includes(projectId)) {
    next.projectIds = [...next.projectIds, projectId]
  }
}

export function upsertApp(
  app: ProjectApp & { members?: Array<{ personId: string; role: string }> },
): ProjectApp {
  const { members, ...rest } = app
  const withId = rest.id ? rest : { ...rest, id: `app-${Date.now()}` }
  const idx = db.apps.findIndex((a) => a.id === withId.id)
  if (idx >= 0) db.apps[idx] = withId
  else db.apps.unshift(withId)
  if (members?.length) {
    setAppMembers(withId.id, members)
  } else if (!db.appMembers[withId.id]) {
    const defaults: Array<{ personId: string; role: AppMemberRole }> = []
    if (withId.ownerId) defaults.push({ personId: withId.ownerId, role: 'AppManager' })
    setAppMembers(withId.id, defaults)
  }
  persist()
  return withId
}

export function deleteApp(id: string): boolean {
  const before = db.apps.length
  db.apps = db.apps.filter((a) => a.id !== id)
  if (db.apps.length === before) return false
  delete db.appMembers[id]
  delete db.appAccess[id]
  db.tickets = db.tickets.filter((t) => t.appId !== id)
  persist()
  return true
}

export function reorderApps(orderedIds: string[]) {
  orderedIds.forEach((id, index) => {
    const app = db.apps.find((a) => a.id === id)
    if (app) app.sortOrder = index + 1
  })
  persist()
  return [...db.apps].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function decideApproval(
  id: string,
  status: Exclude<ApprovalStatus, 'Pending'>,
  actorId: string,
  comment?: string,
): Approval | null {
  const idx = db.approvals.findIndex((a) => a.id === id)
  if (idx < 0) return null
  const current = db.approvals[idx]
  if (current.status !== 'Pending') return current
  const next: Approval = {
    ...current,
    status,
    decidedAt: new Date().toISOString(),
    comments: comment
      ? [...current.comments, { authorId: actorId, text: comment, at: new Date().toISOString() }]
      : current.comments,
  }
  db.approvals[idx] = next
  pushActivity({
    projectId: next.projectId,
    type: 'approval',
    title: `Approval ${status.toLowerCase()}`,
    titleAr: status === 'Approved' ? 'تم اعتماد الطلب' : 'تم رفض الطلب',
    actorId,
  })
  persist()
  return next
}

export function upsertTask(task: WbsItem, actorId: string): WbsItem {
  const idx = db.wbs.findIndex((w) => w.id === task.id)
  const exists = idx >= 0
  if (exists) db.wbs[idx] = task
  else db.wbs.unshift(task)
  pushActivity({
    projectId: task.projectId,
    type: 'task',
    title: exists ? `Task updated: ${task.name}` : `Task created: ${task.name}`,
    titleAr: exists ? `تم تحديث المهمة: ${task.nameAr}` : `تم إنشاء المهمة: ${task.nameAr}`,
    actorId,
  })
  persist()
  return task
}

export function updateTaskStatus(id: string, status: TaskStatus): WbsItem | null {
  const idx = db.wbs.findIndex((w) => w.id === id)
  if (idx < 0) return null
  db.wbs[idx] = {
    ...db.wbs[idx],
    status,
    progress: status === 'Completed' ? 100 : db.wbs[idx].progress,
  }
  persist()
  return db.wbs[idx]
}

export function deleteTask(id: string): boolean {
  const before = db.wbs.length
  db.wbs = db.wbs.filter((w) => w.id !== id)
  if (db.wbs.length === before) return false
  persist()
  return true
}

export function upsertRisk(risk: Risk): Risk {
  const idx = db.risks.findIndex((r) => r.id === risk.id)
  if (idx >= 0) db.risks[idx] = risk
  else db.risks.unshift(risk)
  persist()
  return risk
}

export function upsertMilestone(m: Milestone): Milestone {
  const idx = db.milestones.findIndex((x) => x.id === m.id)
  if (idx >= 0) db.milestones[idx] = m
  else db.milestones.unshift(m)
  persist()
  return m
}

export function addTransaction(tx: BudgetTransaction): BudgetTransaction {
  db.transactions.unshift(tx)
  const project = db.projects.find((p) => p.id === tx.projectId)
  if (project && tx.type === 'expense') {
    project.budgetSpent += tx.amount
  }
  if (project && tx.type === 'adjustment') {
    project.budgetAllocated += tx.amount
  }
  persist()
  return tx
}

export function addDocument(doc: DocumentItem): DocumentItem {
  db.documents.unshift(doc)
  persist()
  return doc
}

export function markNotificationRead(id: string): NotificationItem | null {
  const n = db.notifications.find((x) => x.id === id)
  if (!n) return null
  n.read = true
  persist()
  return n
}

export function markAllNotificationsRead(personId?: string): NotificationItem[] {
  db.notifications = db.notifications.map((n) => {
    if (personId && n.recipientId && n.recipientId !== personId) return n
    return { ...n, read: true }
  })
  persist()
  return personId
    ? db.notifications.filter((n) => !n.recipientId || n.recipientId === personId)
    : db.notifications
}

export function getPerson(id: string): Person | undefined {
  return db.people.find((p) => p.id === id)
}
