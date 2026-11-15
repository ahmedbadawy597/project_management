export type ProjectStatus = 'Active' | 'Planned' | 'Completed' | 'On Hold'
export type HealthStatus = 'On Track' | 'At Risk' | 'Delayed' | 'Not Started' | 'Completed'
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'
export type TaskStatus = 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Blocked' | 'Completed'
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'
export type MilestoneStatus = 'Upcoming' | 'Completed' | 'Delayed' | 'Accepted'
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected'
export type ApprovalType =
  | 'Project Initiation'
  | 'Project Plan'
  | 'Baseline'
  | 'Deadline Change'
  | 'Budget Change'
  | 'Deliverable Acceptance'
  | 'Project Closure'
export type SlaStatus = 'On Track' | 'Warning' | 'Breached' | 'Met'
export type ActivityType =
  | 'status'
  | 'milestone'
  | 'approval'
  | 'risk'
  | 'schedule'
  | 'manager'
  | 'task'
  | 'document'

export interface Person {
  id: string
  name: string
  nameAr: string
  role: string
  /** RBAC role for capabilities */
  appRole?: string
  email: string
  department: string
  allocation: number
  availability: number
  active?: boolean
  projectIds: string[]
}

export interface Project {
  id: string
  code: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  managerId: string
  status: ProjectStatus
  plannedProgress: number
  actualProgress: number
  plannedStart: string
  plannedEnd: string
  forecastEnd: string
  actualStart?: string
  phase: string
  budgetApproved: number
  budgetAllocated: number
  budgetSpent: number
  slaCompliance: number
  riskLevel: RiskLevel
  summary: string
  summaryAr: string
  managerUpdate: string
  managerUpdateAr: string
  charter: string
  charterAr: string
}

/** Application / module delivered inside a project */
export type ProjectAppStatus = 'Planned' | 'Active' | 'Completed' | 'On Hold'
export type AppPublishStatus =
  | 'Published'
  | 'Draft'
  | 'UnderReview'
  | 'Unpublished'
  | 'يعمل'
  | 'محدّث حديثًا'
  | (string & {})

export interface ProjectApp {
  id: string
  projectId: string
  code: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  ownerId?: string
  status: ProjectAppStatus
  plannedStart: string
  plannedEnd: string
  url?: string
  userCount?: number
  readiness?: number
  iconColor?: string
  publishStatus?: AppPublishStatus
  featured?: boolean
  sortOrder?: number
}

export type AppMemberRole = 'AppManager' | 'Developer' | 'Business' | 'Contributor'

export interface AppMember {
  personId: string
  role: AppMemberRole
  name?: string
  nameAr?: string
  email?: string
}

export type TicketTag =
  | 'Risk'
  | 'Problem'
  | 'NeedHelp'
  | 'Immediate'
  | 'Blocked'
  | 'Decision'
  | 'Update'

export type TicketUrgency = 'Normal' | 'High' | 'Immediate'
export type TicketType = 'Task' | 'Problem' | 'Help' | 'Risk' | 'Bug'
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed'

export interface TicketComment {
  id: string
  ticketId: string
  authorId: string
  body: string
  createdAt: string
}

export interface Ticket {
  id: string
  projectId: string
  appId?: string
  type: TicketType | string
  status: TicketStatus | string
  priority: Priority | string
  urgency: TicketUrgency | string
  tags: TicketTag[] | string[]
  title: string
  titleAr: string
  body: string
  bodyAr: string
  reporterId: string
  assigneeId?: string
  linkedRiskId?: string
  linkedWbsId?: string
  createdAt: string
  updatedAt: string
  commentCount?: number
  comments?: TicketComment[]
}

export const TICKET_TAGS: TicketTag[] = [
  'Risk',
  'Problem',
  'NeedHelp',
  'Immediate',
  'Blocked',
  'Decision',
  'Update',
]

export const APP_MEMBER_ROLES: AppMemberRole[] = [
  'AppManager',
  'Developer',
  'Business',
  'Contributor',
]

export interface WbsItem {
  id: string
  projectId: string
  parentId?: string
  name: string
  nameAr: string
  type: 'phase' | 'task' | 'milestone'
  start: string
  end: string
  baselineStart: string
  baselineEnd: string
  progress: number
  dependencies: string[]
  assigneeId?: string
  critical?: boolean
  status: TaskStatus | 'Milestone'
  priority?: Priority
  estimatedHours?: number
  actualHours?: number
  description?: string
}

export interface Milestone {
  id: string
  projectId: string
  name: string
  nameAr: string
  ownerId: string
  baselineDate: string
  forecastDate: string
  actualDate?: string
  status: MilestoneStatus
  dependencies: string[]
  deliverables: string[]
  deliverablesAr: string[]
}

export interface SlaRecord {
  id: string
  reference: string
  projectId: string
  category: string
  managerId: string
  targetHours: number
  consumedHours: number
  compliance: number
  status: SlaStatus
  warningThreshold: number
  openedAt: string
  dueAt: string
  escalationCount: number
}

export interface Risk {
  id: string
  projectId: string
  title: string
  titleAr: string
  ownerId: string
  probability: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
  severity: RiskLevel
  mitigation: string
  mitigationAr: string
  targetDate: string
  status: 'Open' | 'Mitigating' | 'Closed'
  type: 'risk' | 'issue'
  overdue?: boolean
}

export interface BudgetTransaction {
  id: string
  projectId: string
  date: string
  category: string
  description: string
  amount: number
  type: 'expense' | 'allocation' | 'adjustment'
}

export interface Approval {
  id: string
  projectId: string
  type: ApprovalType
  title: string
  titleAr: string
  requesterId: string
  status: ApprovalStatus
  submittedAt: string
  decidedAt?: string
  comments: { authorId: string; text: string; at: string }[]
}

export interface DocumentItem {
  id: string
  projectId: string
  name: string
  category: string
  uploadedBy: string
  uploadedAt: string
  size: string
  version: string
}

export interface ActivityItem {
  id: string
  projectId: string
  type: ActivityType
  title: string
  titleAr: string
  actorId: string
  at: string
}

export interface NotificationItem {
  id: string
  title: string
  titleAr: string
  body: string
  bodyAr: string
  at: string
  read: boolean
  href?: string
  /** When set, only this person should see the notification. */
  recipientId?: string
  projectId?: string
  appId?: string
}

export interface AppState {
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
  language: 'en' | 'ar'
  sidebarCollapsed: boolean
  currentUserId: string
}
