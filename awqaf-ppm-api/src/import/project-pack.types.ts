export type PackIssue = {
  sheet: string
  row?: number
  field?: string
  message: string
  messageAr: string
}

export type ParsedProjectRow = {
  project_code: string
  name_ar: string
  name_en: string
  manager_email: string
  status: string
  planned_start: string
  planned_end: string
  phase: string
  description_ar: string
  description_en: string
}

export type ParsedAppRow = {
  project_code: string
  app_code: string
  name_ar: string
  name_en: string
  owner_email: string
  status: string
  planned_start: string
  planned_end: string
  description_ar: string
}

export type ParsedTeamRow = {
  project_code: string
  app_code: string
  person_email: string
  role: string
}

export type ParsedScheduleRow = {
  section: 'schedule'
  item_code: string
  parent_code: string
  type: 'phase' | 'task'
  name_ar: string
  name_en: string
  start: string
  end: string
  progress: number
  weight_pct?: number
  assignee_email: string
  depends_on: string
  deliverable_ar: string
}

export type ParsedMilestoneRow = {
  section: 'milestone'
  item_code: string
  name_ar: string
  name_en: string
  owner_email: string
  baseline_date: string
  forecast_date: string
  status: string
  deliverables_ar: string
}

export type ParsedRiskRow = {
  section: 'risk'
  item_code: string
  type: 'risk' | 'issue'
  name_ar: string
  name_en: string
  severity: string
  status: string
  owner_email: string
  end: string
}

export type ParsedPlanRow = ParsedScheduleRow | ParsedMilestoneRow | ParsedRiskRow

export type ParsedAppPlan = {
  sheet: string
  app_code: string
  rows: ParsedPlanRow[]
}

export type ParsedProjectPack = {
  project: ParsedProjectRow
  apps: ParsedAppRow[]
  team: ParsedTeamRow[]
  plans: ParsedAppPlan[]
}

export type ImportSummary = {
  projectCode: string
  projectId: string
  apps: number
  team: number
  scheduleItems: number
  milestones: number
  risks: number
  created: boolean
}
