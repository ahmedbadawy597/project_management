export type AppRole =
  | 'Portfolio Director'
  | 'Project Manager'
  | 'Developer'
  | 'Business'
  | 'PMO Analyst'
  | 'Executive Viewer'

export type Capability =
  | 'portfolio:view'
  | 'executive:view'
  | 'projects:view'
  | 'projects:write'
  | 'tasks:write'
  | 'milestones:write'
  | 'risks:write'
  | 'sla:view'
  | 'budget:view'
  | 'budget:adjust'
  | 'documents:view'
  | 'documents:upload'
  | 'approvals:view'
  | 'approvals:decide'
  | 'reports:view'
  | 'reports:export'
  | 'resources:view'
  | 'notifications:view'
  | 'admin:view'
  | 'gantt:view'
  | 'roadmap:view'

const ALL: Capability[] = [
  'portfolio:view',
  'executive:view',
  'projects:view',
  'projects:write',
  'tasks:write',
  'milestones:write',
  'risks:write',
  'sla:view',
  'budget:view',
  'budget:adjust',
  'documents:view',
  'documents:upload',
  'approvals:view',
  'approvals:decide',
  'reports:view',
  'reports:export',
  'resources:view',
  'notifications:view',
  'admin:view',
  'gantt:view',
  'roadmap:view',
]

const ROLE_CAPABILITIES: Record<AppRole, Capability[]> = {
  'Portfolio Director': ALL,
  /** Same capabilities as Portfolio Director (admin, approvals, budget adjust, full write). */
  'Project Manager': ALL,
  Developer: [
    'projects:view',
    'tasks:write',
    'risks:write',
    'notifications:view',
  ],
  Business: [
    'projects:view',
    'tasks:write',
    'documents:view',
    'approvals:view',
    'notifications:view',
  ],
  'PMO Analyst': [
    'portfolio:view',
    'executive:view',
    'projects:view',
    'tasks:write',
    'sla:view',
    'budget:view',
    'documents:view',
    'approvals:view',
    'reports:view',
    'reports:export',
    'resources:view',
    'notifications:view',
    'gantt:view',
    'roadmap:view',
  ],
  'Executive Viewer': [
    'portfolio:view',
    'executive:view',
    'projects:view',
    'reports:view',
    'notifications:view',
    'roadmap:view',
  ],
}

export const ROLE_ACCESS_COPY: Record<AppRole, string> = {
  'Portfolio Director':
    'System admin — create users, manage all projects/apps/teams, approvals, and full system access',
  'Project Manager':
    'Same as Portfolio Director — create users, manage all projects/apps/teams, approvals, and full system access',
  Developer: 'Delivery work — tasks, tickets, and risks for assigned apps',
  Business: 'Business stakeholder — tickets, status, approvals view, and reports for assigned apps',
  'PMO Analyst': 'Read portfolio, export reports, collaborate on tickets for assigned apps',
  'Executive Viewer': 'Executive dashboard and portfolio reports only',
}

export function capabilitiesForRole(role: AppRole): Capability[] {
  return ROLE_CAPABILITIES[role] ?? []
}

export function hasCapability(role: AppRole, capability: Capability): boolean {
  return capabilitiesForRole(role).includes(capability)
}

export function mapPersonRoleToAppRole(personRole: string): AppRole {
  if (personRole === 'Portfolio Director') return 'Portfolio Director'
  if (personRole === 'Project Manager') return 'Project Manager'
  if (personRole === 'Developer') return 'Developer'
  if (personRole === 'Business') return 'Business'
  if (personRole === 'PMO Analyst') return 'PMO Analyst'
  if (personRole === 'Business Analyst') return 'Business'
  if (
    personRole === 'Executive Viewer' ||
    personRole.includes('Director') ||
    personRole.includes('Executive')
  ) {
    return personRole === 'Portfolio Director' ? 'Portfolio Director' : 'Executive Viewer'
  }
  if (
    ['Lead Developer', 'Frontend Engineer', 'QA Lead', 'Solution Architect', 'UX Designer'].includes(
      personRole,
    )
  ) {
    return 'Developer'
  }
  return 'Executive Viewer'
}

/** Nav item key → required capability (settings always visible when authenticated). */
export const NAV_CAPABILITY: Record<string, Capability | null> = {
  executive: 'executive:view',
  portfolio: 'portfolio:view',
  projects: 'projects:view',
  manage: 'projects:write',
  teams: 'projects:write',
  appsCatalog: 'projects:view',
  roadmap: 'roadmap:view',
  gantt: 'gantt:view',
  tasks: 'tasks:write',
  tickets: 'tasks:write',
  milestones: 'milestones:write',
  sla: 'sla:view',
  risks: 'risks:write',
  resources: 'resources:view',
  budget: 'budget:view',
  documents: 'documents:view',
  approvals: 'approvals:view',
  reports: 'reports:view',
  notifications: 'notifications:view',
  admin: 'admin:view',
  settings: null,
}
