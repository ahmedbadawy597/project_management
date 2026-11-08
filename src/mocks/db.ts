import { seedState } from '@/data/seed'
import type {
  ActivityItem,
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
  WbsItem,
} from '@/data/types'

const STORAGE_KEY = 'awqaf-ppm-mock-db'

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
}

function cloneSeed(): MockDb {
  return structuredClone({
    projects: seedState.projects,
    people: seedState.people,
    wbs: seedState.wbs,
    milestones: seedState.milestones,
    slas: seedState.slas,
    risks: seedState.risks,
    transactions: seedState.transactions,
    approvals: seedState.approvals,
    documents: seedState.documents,
    activities: seedState.activities,
    notifications: seedState.notifications,
    apps: seedState.apps,
  })
}

let db: MockDb = load()

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb
      if (!Array.isArray(parsed.apps)) parsed.apps = structuredClone(seedState.apps)
      parsed.milestones = (parsed.milestones ?? []).map((m) => ({
        ...m,
        deliverablesAr: Array.isArray(m.deliverablesAr) ? m.deliverablesAr : m.deliverables ?? [],
      }))
      return parsed
    }
  } catch {
    /* ignore */
  }
  return cloneSeed()
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function getDb(): MockDb {
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

export function upsertApp(app: ProjectApp): ProjectApp {
  const idx = db.apps.findIndex((a) => a.id === app.id)
  if (idx >= 0) db.apps[idx] = app
  else db.apps.unshift(app)
  persist()
  return app
}

export function deleteApp(id: string): boolean {
  const before = db.apps.length
  db.apps = db.apps.filter((a) => a.id !== id)
  if (db.apps.length === before) return false
  persist()
  return true
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

export function markAllNotificationsRead(): NotificationItem[] {
  db.notifications = db.notifications.map((n) => ({ ...n, read: true }))
  persist()
  return db.notifications
}

export function getPerson(id: string): Person | undefined {
  return db.people.find((p) => p.id === id)
}
