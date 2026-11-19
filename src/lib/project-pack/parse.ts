import * as XLSX from 'xlsx'
import {
  APP_COLUMNS,
  PLAN_COLUMNS,
  PLAN_SHEET_PREFIX,
  PROJECT_COLUMNS,
  SHEETS,
  TEAM_COLUMNS,
} from './constants'
import { appCodeFromPlanSheet, slugCode } from './ids'
import type {
  ParsedAppPlan,
  ParsedAppRow,
  ParsedMilestoneRow,
  ParsedPlanRow,
  ParsedProjectPack,
  ParsedProjectRow,
  ParsedRiskRow,
  ParsedScheduleRow,
  ParsedTeamRow,
  PackIssue,
} from './types'

function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key]
  if (v == null) return ''
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Excel serial date?
    if (v > 20000 && v < 80000) {
      const parsed = XLSX.SSF.parse_date_code(v)
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
      }
    }
    return String(v)
  }
  return String(v).trim()
}

/** Find the header row that contains the required key columns (skips branded banners). */
function sheetToObjects(
  wb: XLSX.WorkBook,
  name: string,
  requiredKeys: readonly string[],
): { rows: Record<string, unknown>[]; issues: PackIssue[] } {
  const issues: PackIssue[] = []
  const sheet = wb.Sheets[name]
  if (!sheet) {
    issues.push({
      sheet: name,
      message: `Missing sheet: ${name}`,
      messageAr: `الورقة مفقودة: ${name}`,
    })
    return { rows: [], issues }
  }

  const aoa = XLSX.utils.sheet_to_json<(string | number | Date | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  })

  const key0 = requiredKeys[0]
  let headerIdx = aoa.findIndex((row) =>
    row.some((cell) => String(cell ?? '').trim() === key0),
  )
  if (headerIdx < 0) {
    issues.push({
      sheet: name,
      field: key0,
      message: `Missing column "${key0}"`,
      messageAr: `العمود مفقود "${key0}"`,
    })
    return { rows: [], issues }
  }

  const header = (aoa[headerIdx] ?? []).map((c) => String(c ?? '').trim())
  for (const col of requiredKeys) {
    if (!header.includes(col)) {
      issues.push({
        sheet: name,
        field: col,
        message: `Missing column "${col}"`,
        messageAr: `العمود مفقود "${col}"`,
      })
    }
  }

  const rows: Record<string, unknown>[] = []
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const line = aoa[i] ?? []
    const obj: Record<string, unknown> = {}
    let any = false
    header.forEach((key, colIdx) => {
      if (!key) return
      const v = line[colIdx]
      obj[key] = v ?? ''
      if (v !== '' && v != null) any = true
    })
    if (any) rows.push(obj)
  }
  return { rows, issues }
}

function num(v: string, fallback = 0): number {
  if (!v) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function parsePlanRows(sheet: string, raw: Record<string, unknown>[]): { rows: ParsedPlanRow[]; issues: PackIssue[] } {
  const issues: PackIssue[] = []
  const rows: ParsedPlanRow[] = []
  raw.forEach((r, idx) => {
    const section = cell(r, 'section').toLowerCase()
    const item_code = cell(r, 'item_code')
    if (!section && !item_code) return
    const excelRow = idx + 2
    if (section === 'schedule') {
      const type = cell(r, 'type').toLowerCase()
      rows.push({
        section: 'schedule',
        item_code,
        parent_code: cell(r, 'parent_code'),
        type: type === 'task' ? 'task' : 'phase',
        name_ar: cell(r, 'name_ar'),
        name_en: cell(r, 'name_en'),
        start: cell(r, 'start'),
        end: cell(r, 'end'),
        progress: num(cell(r, 'progress'), 0),
        weight_pct: cell(r, 'weight_pct') ? num(cell(r, 'weight_pct')) : undefined,
        assignee_email: cell(r, 'assignee_email').toLowerCase(),
        depends_on: cell(r, 'depends_on'),
        deliverable_ar: cell(r, 'deliverable_ar'),
      } satisfies ParsedScheduleRow)
      return
    }
    if (section === 'milestone') {
      rows.push({
        section: 'milestone',
        item_code,
        name_ar: cell(r, 'name_ar'),
        name_en: cell(r, 'name_en'),
        owner_email: cell(r, 'owner_email').toLowerCase(),
        baseline_date: cell(r, 'baseline_date'),
        forecast_date: cell(r, 'forecast_date'),
        status: (cell(r, 'status') || 'Upcoming') as ParsedMilestoneRow['status'],
        deliverables_ar: cell(r, 'deliverables_ar'),
      } satisfies ParsedMilestoneRow)
      return
    }
    if (section === 'risk') {
      rows.push({
        section: 'risk',
        item_code,
        type: cell(r, 'type').toLowerCase() === 'issue' ? 'issue' : 'risk',
        name_ar: cell(r, 'name_ar') || cell(r, 'title_ar'),
        name_en: cell(r, 'name_en') || cell(r, 'title_en'),
        severity: (cell(r, 'severity') || 'Medium') as ParsedRiskRow['severity'],
        status: (cell(r, 'status') || 'Open') as ParsedRiskRow['status'],
        owner_email: cell(r, 'owner_email').toLowerCase(),
        end: cell(r, 'end') || cell(r, 'due_date'),
      } satisfies ParsedRiskRow)
      return
    }
    issues.push({
      sheet,
      row: excelRow,
      field: 'section',
      message: `Unknown section "${section}" (use schedule|milestone|risk)`,
      messageAr: `قسم غير معروف "${section}" (استخدم schedule|milestone|risk)`,
    })
  })
  return { rows, issues }
}

export function parseProjectPack(data: ArrayBuffer): { pack: ParsedProjectPack | null; issues: PackIssue[] } {
  const issues: PackIssue[] = []
  const wb = XLSX.read(data, { type: 'array', cellDates: true })

  const projectRes = sheetToObjects(wb, SHEETS.project, PROJECT_COLUMNS)
  issues.push(...projectRes.issues)

  const appsRes = sheetToObjects(wb, SHEETS.apps, APP_COLUMNS)
  issues.push(...appsRes.issues)

  const teamRes = wb.Sheets[SHEETS.team]
    ? sheetToObjects(wb, SHEETS.team, TEAM_COLUMNS)
    : { rows: [] as Record<string, unknown>[], issues: [] as PackIssue[] }
  issues.push(...teamRes.issues)

  if (issues.some((i) => i.message.startsWith('Missing sheet') || i.message.startsWith('Missing column'))) {
    return { pack: null, issues }
  }

  const projectRows = projectRes.rows
    .map((r) => ({
      project_code: slugCode(cell(r, 'project_code')),
      name_ar: cell(r, 'name_ar'),
      name_en: cell(r, 'name_en'),
      manager_email: cell(r, 'manager_email').toLowerCase(),
      status: (cell(r, 'status') || 'Planned') as ParsedProjectRow['status'],
      planned_start: cell(r, 'planned_start'),
      planned_end: cell(r, 'planned_end'),
      phase: cell(r, 'phase') || 'Initiation',
      description_ar: cell(r, 'description_ar'),
      description_en: cell(r, 'description_en'),
    }))
    .filter((r) => r.project_code)

  if (projectRows.length === 0) {
    issues.push({
      sheet: SHEETS.project,
      message: '01_Project must contain one project row',
      messageAr: 'يجب أن تحتوي 01_Project على صف مشروع واحد',
    })
    return { pack: null, issues }
  }
  if (projectRows.length > 1) {
    issues.push({
      sheet: SHEETS.project,
      message: 'V1 supports one project per workbook — extra rows ignored after first',
      messageAr: 'الإصدار الحالي يدعم مشروعاً واحداً لكل ملف — سيتم تجاهل الصفوف الإضافية',
    })
  }
  const project = projectRows[0]

  const apps: ParsedAppRow[] = appsRes.rows
    .map((r) => ({
      project_code: slugCode(cell(r, 'project_code')) || project.project_code,
      app_code: slugCode(cell(r, 'app_code')),
      name_ar: cell(r, 'name_ar'),
      name_en: cell(r, 'name_en'),
      owner_email: cell(r, 'owner_email').toLowerCase(),
      status: (cell(r, 'status') || 'Planned') as ParsedAppRow['status'],
      planned_start: cell(r, 'planned_start'),
      planned_end: cell(r, 'planned_end'),
      description_ar: cell(r, 'description_ar'),
    }))
    .filter((r) => r.app_code)

  const team: ParsedTeamRow[] = teamRes.rows
    .map((r) => ({
      project_code: slugCode(cell(r, 'project_code')) || project.project_code,
      app_code: cell(r, 'app_code') ? slugCode(cell(r, 'app_code')) : '',
      person_email: cell(r, 'person_email').toLowerCase(),
      role: (cell(r, 'role') || 'Contributor') as ParsedTeamRow['role'],
    }))
    .filter((r) => r.person_email)

  const plans: ParsedAppPlan[] = []
  for (const name of wb.SheetNames) {
    if (!name.startsWith(PLAN_SHEET_PREFIX)) continue
    const appCode = appCodeFromPlanSheet(name)
    if (!appCode) continue
    const { rows: raw, issues: sheetIssues } = sheetToObjects(wb, name, PLAN_COLUMNS)
    issues.push(...sheetIssues)
    const parsed = parsePlanRows(name, raw)
    issues.push(...parsed.issues)
    plans.push({ sheet: name, app_code: appCode, rows: parsed.rows })
  }

  return {
    pack: { project, apps, team, plans },
    issues,
  }
}
