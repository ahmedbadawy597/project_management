import type {
  AppMemberRole,
  MilestoneStatus,
  ProjectAppStatus,
  ProjectStatus,
  RiskLevel,
} from '@/data/types'

export const TEMPLATE_FILE_NAME = 'Awqaf_PPM_Project_Pack_Template.xlsx'
export const SAMPLE_FILE_NAME = 'Awqaf_PPM_Project_Pack_Sample.xlsx'
export const EXPORT_FILE_PREFIX = 'Awqaf_PPM_Project_Pack_'

export const SHEETS = {
  instructions: '00_Instructions',
  project: '01_Project',
  apps: '02_Apps',
  team: '03_Team',
  lists: '99_Lists',
  planTemplate: 'Plan_TEMPLATE',
} as const

export const PLAN_SHEET_PREFIX = 'Plan_'

export const PROJECT_COLUMNS = [
  'project_code',
  'name_ar',
  'name_en',
  'manager_email',
  'status',
  'planned_start',
  'planned_end',
  'phase',
  'description_ar',
  'description_en',
] as const

export const APP_COLUMNS = [
  'project_code',
  'app_code',
  'name_ar',
  'name_en',
  'owner_email',
  'status',
  'planned_start',
  'planned_end',
  'description_ar',
] as const

export const TEAM_COLUMNS = [
  'project_code',
  'app_code',
  'person_email',
  'role',
] as const

export const PLAN_COLUMNS = [
  'section',
  'item_code',
  'parent_code',
  'type',
  'name_ar',
  'name_en',
  'start',
  'end',
  'progress',
  'weight_pct',
  'assignee_email',
  'owner_email',
  'depends_on',
  'baseline_date',
  'forecast_date',
  'status',
  'severity',
  'deliverables_ar',
  'deliverable_ar',
] as const

export const PROJECT_STATUSES: ProjectStatus[] = ['Planned', 'Active', 'On Hold', 'Completed']
export const APP_STATUSES: ProjectAppStatus[] = ['Planned', 'Active', 'On Hold', 'Completed']
export const TEAM_ROLES: AppMemberRole[] = ['AppManager', 'Developer', 'Business', 'Contributor']
export const PLAN_SECTIONS = ['schedule', 'milestone', 'risk'] as const
export const SCHEDULE_TYPES = ['phase', 'task'] as const
export const RISK_TYPES = ['risk', 'issue'] as const
export const RISK_SEVERITIES: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical']
export const RISK_STATUSES = ['Open', 'Mitigating', 'Closed'] as const
export const MILESTONE_STATUSES: MilestoneStatus[] = ['Upcoming', 'Completed', 'Delayed', 'Accepted']

export const DATE_FORMAT = 'YYYY-MM-DD'

export const PHASE_SKELETON: Array<{
  item_code: string
  parent_code: string
  type: 'phase' | 'task'
  name_ar: string
  name_en: string
  weight_pct: number
}> = [
  { item_code: 'PH-ANALYSIS', parent_code: '', type: 'phase', name_ar: 'التحليل', name_en: 'Analysis', weight_pct: 10 },
  { item_code: 'PH-DESIGN', parent_code: '', type: 'phase', name_ar: 'التصميم', name_en: 'Design', weight_pct: 10 },
  { item_code: 'PH-BUILD-R1', parent_code: '', type: 'phase', name_ar: 'التطوير – الإصدار 1', name_en: 'Build – Release 1', weight_pct: 20 },
  { item_code: 'PH-BUILD-R2', parent_code: '', type: 'phase', name_ar: 'التطوير – الإصدار 2', name_en: 'Build – Release 2', weight_pct: 15 },
  { item_code: 'PH-BUILD-R3', parent_code: '', type: 'phase', name_ar: 'التطوير – الإصدار 3', name_en: 'Build – Release 3', weight_pct: 15 },
  { item_code: 'PH-STAGING', parent_code: '', type: 'phase', name_ar: 'Staging', name_en: 'Staging', weight_pct: 5 },
  { item_code: 'PH-TEST', parent_code: '', type: 'phase', name_ar: 'الاختبار', name_en: 'Test / UAT', weight_pct: 10 },
  { item_code: 'PH-PROD', parent_code: '', type: 'phase', name_ar: 'الإنتاج / الإطلاق', name_en: 'Production / Go-Live', weight_pct: 10 },
  { item_code: 'PH-TRAINING', parent_code: '', type: 'phase', name_ar: 'التدريب', name_en: 'Training', weight_pct: 3 },
  { item_code: 'PH-SUPPORT', parent_code: '', type: 'phase', name_ar: 'الدعم', name_en: 'Support', weight_pct: 2 },
]
