export type AppRole =
  | 'Portfolio Director'
  | 'Project Manager'
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
  'Project Manager': [
    'portfolio:view',
    'executive:view',
    'projects:view',
    'projects:write',
    'tasks:write',
    'milestones:write',
    'risks:write',
    'sla:view',
    'budget:view',
    'documents:view',
    'documents:upload',
    'approvals:view',
    'reports:view',
    'reports:export',
    'resources:view',
    'notifications:view',
    'gantt:view',
    'roadmap:view',
  ],
  'PMO Analyst': [
    'portfolio:view',
    'executive:view',
    'projects:view',
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
  'Portfolio Director': 'Full portfolio, approvals, reports, and administration',
  'Project Manager': 'Assigned projects, tasks, milestones, risks, and documents',
  'PMO Analyst': 'Read portfolio, export reports, view governance data',
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
  if (personRole === 'PMO Analyst' || personRole === 'Business Analyst') return 'PMO Analyst'
  if (
    personRole === 'Executive Viewer' ||
    personRole.includes('Director') ||
    personRole.includes('Executive')
  ) {
    return personRole === 'Portfolio Director' ? 'Portfolio Director' : 'Executive Viewer'
  }
  // Delivery staff map to PM-equivalent read/write for demo personas
  if (
    ['Lead Developer', 'Frontend Engineer', 'QA Lead', 'Solution Architect', 'UX Designer'].includes(
      personRole,
    )
  ) {
    return 'Project Manager'
  }
  return 'Executive Viewer'
}

/** Nav item key → required capability (settings always visible when authenticated). */
export const NAV_CAPABILITY: Record<string, Capability | null> = {
  executive: 'executive:view',
  portfolio: 'portfolio:view',
  projects: 'projects:view',
  manage: 'projects:write',
  roadmap: 'roadmap:view',
  gantt: 'gantt:view',
  tasks: 'tasks:write',
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
