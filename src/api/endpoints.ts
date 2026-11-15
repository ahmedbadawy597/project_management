import type {
  Approval,
  ApprovalStatus,
  AppMember,
  BudgetTransaction,
  DocumentItem,
  Milestone,
  NotificationItem,
  Person,
  Project,
  ProjectApp,
  ProjectStatus,
  Risk,
  RiskLevel,
  SlaRecord,
  TaskStatus,
  Ticket,
  WbsItem,
  ActivityItem,
} from '@/data/types'

export type CreateProjectInput = {
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
import type { Persona } from '@/auth/personas'
import type { AppRole, Capability } from '@/auth/permissions'
import { apiFetch } from './client'

export interface AuthUser {
  id: string
  personaId: string
  name: string
  nameAr: string
  email: string
  username: string
  role: AppRole
  capabilities: Capability[]
  mustChangePassword: boolean
}

export interface BootstrapState {
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
  /** projectId → personIds */
  projectMembers?: Record<string, string[]>
  /** appId → members with roles */
  appMembers?: Record<string, Array<{ personId: string; role: string }>>
  /** @deprecated prefer appMembers */
  appAccess?: Record<string, string[]>
}

export type AppMemberInput = { personId: string; role: string }

export type CreateTicketInput = {
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

export type TicketFilters = {
  projectId?: string
  appId?: string
  assigneeId?: string
  status?: string
  tag?: string
  urgency?: string
}

export type CreatePersonInput = {
  name: string
  nameAr?: string
  email: string
  department?: string
  role?: string
  appRole?: AppRole
  allocation?: number
  availability?: number
  active?: boolean
  projectIds?: string[]
}

export type UpdatePersonInput = Partial<CreatePersonInput>

export const api = {
  login: (username: string, password: string) =>
    apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<AuthUser>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  me: () => apiFetch<AuthUser>('/auth/me'),
  personas: () => apiFetch<Persona[]>('/auth/personas'),
  bootstrap: () => apiFetch<BootstrapState>('/bootstrap'),
  resetDemo: () => apiFetch<BootstrapState>('/demo/reset', { method: 'POST' }),
  projects: () => apiFetch<Project[]>('/projects'),
  project: (id: string) => apiFetch<Project>(`/projects/${id}`),
  createProject: (input: CreateProjectInput) =>
    apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }),
  updateProject: (id: string, patch: Partial<Project>) =>
    apiFetch<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  apps: (projectId?: string) =>
    apiFetch<ProjectApp[]>(projectId ? `/apps?projectId=${projectId}` : '/apps'),
  upsertApp: (app: ProjectApp & { members?: AppMemberInput[] }) =>
    apiFetch<ProjectApp>(app.id ? `/apps/${app.id}` : '/apps', {
      method: app.id ? 'PUT' : 'POST',
      body: JSON.stringify(app),
    }),
  deleteApp: (id: string) => apiFetch<void>(`/apps/${id}`, { method: 'DELETE' }),
  reorderApps: (orderedIds: string[]) =>
    apiFetch<ProjectApp[]>('/apps/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }),
  appMembers: (appId: string) =>
    apiFetch<{
      appId: string
      projectId: string
      ownerId?: string | null
      members: AppMember[]
    }>(`/apps/${appId}/members`),
  setAppMembers: (appId: string, members: AppMemberInput[]) =>
    apiFetch<{
      appId: string
      projectId: string
      ownerId?: string | null
      members: AppMember[]
    }>(`/apps/${appId}/members`, {
      method: 'PUT',
      body: JSON.stringify({ members }),
    }),
  tickets: (filters: TicketFilters = {}) => {
    const qs = new URLSearchParams()
    if (filters.projectId) qs.set('projectId', filters.projectId)
    if (filters.appId) qs.set('appId', filters.appId)
    if (filters.assigneeId) qs.set('assigneeId', filters.assigneeId)
    if (filters.status) qs.set('status', filters.status)
    if (filters.tag) qs.set('tag', filters.tag)
    if (filters.urgency) qs.set('urgency', filters.urgency)
    const q = qs.toString()
    return apiFetch<Ticket[]>(q ? `/tickets?${q}` : '/tickets')
  },
  ticket: (id: string) => apiFetch<Ticket>(`/tickets/${id}`),
  createTicket: (input: CreateTicketInput) =>
    apiFetch<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(input) }),
  updateTicket: (id: string, patch: Partial<Ticket>) =>
    apiFetch<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  addTicketComment: (id: string, body: string) =>
    apiFetch<Ticket>(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  people: () => apiFetch<Person[]>('/people'),
  createPerson: (input: CreatePersonInput) =>
    apiFetch<Person>('/people', { method: 'POST', body: JSON.stringify(input) }),
  updatePerson: (id: string, patch: UpdatePersonInput) =>
    apiFetch<Person>(`/people/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  projectMembers: (projectId: string) =>
    apiFetch<{
      projectId: string
      managerId: string
      memberIds: string[]
      members: Array<{
        personId: string
        name: string
        nameAr: string
        email: string
        role: string
        appRole: string
      }>
    }>(`/projects/${projectId}/members`),
  setProjectMembers: (projectId: string, personIds: string[]) =>
    apiFetch<{ memberIds: string[] }>(`/projects/${projectId}/members`, {
      method: 'PUT',
      body: JSON.stringify({ personIds }),
    }),
  /** @deprecated use appMembers */
  appAccess: (appId: string) =>
    api.appMembers(appId).then((r) => ({
      appId: r.appId,
      projectId: r.projectId,
      personIds: r.members.map((m) => m.personId),
    })),
  /** @deprecated use setAppMembers */
  setAppAccess: (appId: string, personIds: string[]) =>
    api.setAppMembers(
      appId,
      personIds.map((personId) => ({ personId, role: 'Contributor' })),
    ).then((r) => ({ personIds: r.members.map((m) => m.personId) })),
  wbs: (projectId?: string) =>
    apiFetch<WbsItem[]>(projectId ? `/wbs?projectId=${projectId}` : '/wbs'),
  upsertTask: (task: WbsItem) =>
    apiFetch<WbsItem>(task.id ? `/wbs/${task.id}` : '/wbs', {
      method: task.id ? 'PUT' : 'POST',
      body: JSON.stringify(task),
    }),
  updateTaskStatus: (id: string, status: TaskStatus) =>
    apiFetch<WbsItem>(`/wbs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteTask: (id: string) => apiFetch<void>(`/wbs/${id}`, { method: 'DELETE' }),
  milestones: (projectId?: string) =>
    apiFetch<Milestone[]>(projectId ? `/milestones?projectId=${projectId}` : '/milestones'),
  upsertMilestone: (m: Milestone) =>
    apiFetch<Milestone>(`/milestones/${m.id}`, { method: 'PUT', body: JSON.stringify(m) }),
  slas: (projectId?: string) =>
    apiFetch<SlaRecord[]>(projectId ? `/slas?projectId=${projectId}` : '/slas'),
  risks: (projectId?: string) =>
    apiFetch<Risk[]>(projectId ? `/risks?projectId=${projectId}` : '/risks'),
  upsertRisk: (risk: Risk) =>
    apiFetch<Risk>(`/risks/${risk.id}`, { method: 'PUT', body: JSON.stringify(risk) }),
  createRisk: (risk: Risk) =>
    apiFetch<Risk>('/risks', { method: 'POST', body: JSON.stringify(risk) }),
  transactions: (projectId?: string) =>
    apiFetch<BudgetTransaction[]>(
      projectId ? `/transactions?projectId=${projectId}` : '/transactions',
    ),
  addTransaction: (tx: BudgetTransaction) =>
    apiFetch<BudgetTransaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    }),
  approvals: (projectId?: string) =>
    apiFetch<Approval[]>(projectId ? `/approvals?projectId=${projectId}` : '/approvals'),
  decideApproval: (id: string, status: Exclude<ApprovalStatus, 'Pending'>, comment?: string) =>
    apiFetch<Approval>(`/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ status, comment }),
    }),
  documents: (projectId?: string) =>
    apiFetch<DocumentItem[]>(projectId ? `/documents?projectId=${projectId}` : '/documents'),
  uploadDocument: (body: {
    projectId: string
    name: string
    category: string
    size?: string
    version?: string
  }) =>
    apiFetch<DocumentItem>('/documents', { method: 'POST', body: JSON.stringify(body) }),
  activities: (projectId?: string) =>
    apiFetch<ActivityItem[]>(projectId ? `/activities?projectId=${projectId}` : '/activities'),
  notifications: () => apiFetch<NotificationItem[]>('/notifications'),
  markNotificationRead: (id: string) =>
    apiFetch<NotificationItem>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    apiFetch<NotificationItem[]>('/notifications/read-all', { method: 'POST' }),
}

export const queryKeys = {
  bootstrap: ['bootstrap'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  apps: (projectId?: string) => ['apps', projectId ?? 'all'] as const,
  people: ['people'] as const,
  wbs: (projectId?: string) => ['wbs', projectId ?? 'all'] as const,
  milestones: (projectId?: string) => ['milestones', projectId ?? 'all'] as const,
  slas: (projectId?: string) => ['slas', projectId ?? 'all'] as const,
  risks: (projectId?: string) => ['risks', projectId ?? 'all'] as const,
  transactions: (projectId?: string) => ['transactions', projectId ?? 'all'] as const,
  approvals: (projectId?: string) => ['approvals', projectId ?? 'all'] as const,
  documents: (projectId?: string) => ['documents', projectId ?? 'all'] as const,
  activities: (projectId?: string) => ['activities', projectId ?? 'all'] as const,
  notifications: ['notifications'] as const,
  me: ['auth', 'me'] as const,
  personas: ['auth', 'personas'] as const,
}
