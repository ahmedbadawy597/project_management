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
    'portfolio:view',
    'projects:view',
    'tasks:write',
    'milestones:write',
    'risks:write',
    'sla:view',
    'documents:view',
    'documents:upload',
    'resources:view',
    'notifications:view',
    'gantt:view',
    'roadmap:view',
  ],
  Business: [
    'portfolio:view',
    'executive:view',
    'projects:view',
    'tasks:write',
    'sla:view',
    'budget:view',
    'documents:view',
    'approvals:view',
    'reports:view',
    'notifications:view',
    'roadmap:view',
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

export function capabilitiesForRole(role: AppRole): Capability[] {
  return ROLE_CAPABILITIES[role] ?? []
}

export function hasCapability(role: AppRole, capability: Capability): boolean {
  return capabilitiesForRole(role).includes(capability)
}
