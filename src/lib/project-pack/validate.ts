import type { Person } from '@/data/types'
import {
  APP_STATUSES,
  MILESTONE_STATUSES,
  PROJECT_STATUSES,
  RISK_SEVERITIES,
  RISK_STATUSES,
  TEAM_ROLES,
} from './constants'
import type { ParsedProjectPack, PackIssue } from './types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isDate(v: string) {
  if (!DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime())
}

export type ValidateContext = {
  people: Person[]
}

export function validateProjectPack(pack: ParsedProjectPack, ctx: ValidateContext): PackIssue[] {
  const issues: PackIssue[] = []
  const emails = new Map(ctx.people.map((p) => [p.email.toLowerCase(), p]))
  const appCodes = new Set(pack.apps.map((a) => a.app_code))

  const p = pack.project
  if (!p.project_code) {
    issues.push({
      sheet: '01_Project',
      field: 'project_code',
      message: 'project_code is required',
      messageAr: 'project_code مطلوب',
    })
  }
  if (!p.name_ar && !p.name_en) {
    issues.push({
      sheet: '01_Project',
      field: 'name_ar',
      message: 'Project name (AR or EN) is required',
      messageAr: 'اسم المشروع (عربي أو إنجليزي) مطلوب',
    })
  }
  if (!p.manager_email || !emails.has(p.manager_email)) {
    issues.push({
      sheet: '01_Project',
      field: 'manager_email',
      message: `Unknown manager_email: ${p.manager_email || '(empty)'}`,
      messageAr: `بريد المدير غير معروف: ${p.manager_email || '(فارغ)'}`,
    })
  }
  if (!PROJECT_STATUSES.includes(p.status)) {
    issues.push({
      sheet: '01_Project',
      field: 'status',
      message: `Invalid status: ${p.status}`,
      messageAr: `حالة غير صالحة: ${p.status}`,
    })
  }
  if (!isDate(p.planned_start) || !isDate(p.planned_end)) {
    issues.push({
      sheet: '01_Project',
      field: 'planned_start',
      message: 'planned_start/planned_end must be YYYY-MM-DD',
      messageAr: 'تواريخ المشروع يجب أن تكون YYYY-MM-DD',
    })
  }

  if (pack.apps.length === 0) {
    issues.push({
      sheet: '02_Apps',
      message: 'At least one app row is required',
      messageAr: 'مطلوب صف تطبيق واحد على الأقل',
    })
  }

  pack.apps.forEach((a, i) => {
    const row = i + 2
    if (a.project_code && a.project_code !== p.project_code) {
      issues.push({
        sheet: '02_Apps',
        row,
        field: 'project_code',
        message: `App project_code must match ${p.project_code}`,
        messageAr: `كود مشروع التطبيق يجب أن يطابق ${p.project_code}`,
      })
    }
    if (!a.name_ar && !a.name_en) {
      issues.push({
        sheet: '02_Apps',
        row,
        field: 'name_ar',
        message: `App ${a.app_code}: name required`,
        messageAr: `التطبيق ${a.app_code}: الاسم مطلوب`,
      })
    }
    if (!APP_STATUSES.includes(a.status)) {
      issues.push({
        sheet: '02_Apps',
        row,
        field: 'status',
        message: `Invalid app status: ${a.status}`,
        messageAr: `حالة تطبيق غير صالحة: ${a.status}`,
      })
    }
    if (!isDate(a.planned_start) || !isDate(a.planned_end)) {
      issues.push({
        sheet: '02_Apps',
        row,
        field: 'planned_start',
        message: `App ${a.app_code}: dates must be YYYY-MM-DD`,
        messageAr: `التطبيق ${a.app_code}: التواريخ يجب YYYY-MM-DD`,
      })
    }
    if (a.owner_email && !emails.has(a.owner_email)) {
      issues.push({
        sheet: '02_Apps',
        row,
        field: 'owner_email',
        message: `Unknown owner_email: ${a.owner_email}`,
        messageAr: `بريد المالك غير معروف: ${a.owner_email}`,
      })
    }
  })

  pack.team.forEach((t, i) => {
    const row = i + 2
    if (!emails.has(t.person_email)) {
      issues.push({
        sheet: '03_Team',
        row,
        field: 'person_email',
        message: `Unknown person_email: ${t.person_email}`,
        messageAr: `بريد العضو غير معروف: ${t.person_email}`,
      })
    }
    if (!TEAM_ROLES.includes(t.role)) {
      issues.push({
        sheet: '03_Team',
        row,
        field: 'role',
        message: `Invalid role: ${t.role}`,
        messageAr: `دور غير صالح: ${t.role}`,
      })
    }
    if (t.app_code && !appCodes.has(t.app_code)) {
      issues.push({
        sheet: '03_Team',
        row,
        field: 'app_code',
        message: `Team app_code not in 02_Apps: ${t.app_code}`,
        messageAr: `كود تطبيق الفريق غير موجود في 02_Apps: ${t.app_code}`,
      })
    }
  })

  for (const plan of pack.plans) {
    if (!appCodes.has(plan.app_code)) {
      issues.push({
        sheet: plan.sheet,
        field: 'app_code',
        message: `Plan sheet app code not in 02_Apps: ${plan.app_code}`,
        messageAr: `كود التطبيق في ورقة الخطة غير موجود في 02_Apps: ${plan.app_code}`,
      })
      continue
    }
    const codes = new Set<string>()
    plan.rows.forEach((r, idx) => {
      const row = idx + 2
      if (!r.item_code) {
        issues.push({
          sheet: plan.sheet,
          row,
          field: 'item_code',
          message: 'item_code is required',
          messageAr: 'item_code مطلوب',
        })
        return
      }
      if (codes.has(r.item_code)) {
        issues.push({
          sheet: plan.sheet,
          row,
          field: 'item_code',
          message: `Duplicate item_code: ${r.item_code}`,
          messageAr: `تكرار item_code: ${r.item_code}`,
        })
      }
      codes.add(r.item_code)

      if (r.section === 'schedule') {
        if (!r.name_ar && !r.name_en) {
          issues.push({
            sheet: plan.sheet,
            row,
            message: `Schedule ${r.item_code}: name required`,
            messageAr: `الجدول ${r.item_code}: الاسم مطلوب`,
          })
        }
        if ((r.start && !isDate(r.start)) || (r.end && !isDate(r.end))) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'start',
            message: `Schedule ${r.item_code}: invalid dates`,
            messageAr: `الجدول ${r.item_code}: تواريخ غير صالحة`,
          })
        }
        if (r.assignee_email && !emails.has(r.assignee_email)) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'assignee_email',
            message: `Unknown assignee_email: ${r.assignee_email}`,
            messageAr: `بريد المسند إليه غير معروف: ${r.assignee_email}`,
          })
        }
      }
      if (r.section === 'milestone') {
        if (!MILESTONE_STATUSES.includes(r.status)) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'status',
            message: `Invalid milestone status: ${r.status}`,
            messageAr: `حالة معلم غير صالحة: ${r.status}`,
          })
        }
        if ((r.baseline_date && !isDate(r.baseline_date)) || (r.forecast_date && !isDate(r.forecast_date))) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'baseline_date',
            message: `Milestone ${r.item_code}: invalid dates`,
            messageAr: `المعلم ${r.item_code}: تواريخ غير صالحة`,
          })
        }
        if (r.owner_email && !emails.has(r.owner_email)) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'owner_email',
            message: `Unknown owner_email: ${r.owner_email}`,
            messageAr: `بريد مالك المعلم غير معروف: ${r.owner_email}`,
          })
        }
      }
      if (r.section === 'risk') {
        if (!RISK_SEVERITIES.includes(r.severity)) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'severity',
            message: `Invalid severity: ${r.severity}`,
            messageAr: `خطورة غير صالحة: ${r.severity}`,
          })
        }
        if (!RISK_STATUSES.includes(r.status)) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'status',
            message: `Invalid risk status: ${r.status}`,
            messageAr: `حالة مخاطر غير صالحة: ${r.status}`,
          })
        }
        if (r.end && !isDate(r.end)) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'end',
            message: `Risk ${r.item_code}: invalid due date`,
            messageAr: `المخاطرة ${r.item_code}: تاريخ استحقاق غير صالح`,
          })
        }
        if (r.owner_email && !emails.has(r.owner_email)) {
          issues.push({
            sheet: plan.sheet,
            row,
            field: 'owner_email',
            message: `Unknown owner_email: ${r.owner_email}`,
            messageAr: `بريد مالك المخاطرة غير معروف: ${r.owner_email}`,
          })
        }
      }
    })

    // orphan parents
    for (const r of plan.rows) {
      if (r.section !== 'schedule' || !r.parent_code) continue
      if (!codes.has(r.parent_code)) {
        issues.push({
          sheet: plan.sheet,
          field: 'parent_code',
          message: `Unknown parent_code ${r.parent_code} for ${r.item_code}`,
          messageAr: `parent_code غير معروف ${r.parent_code} للعنصر ${r.item_code}`,
        })
      }
    }
  }

  // warn if apps have no plan sheets (non-blocking — still allow import)
  for (const a of pack.apps) {
    if (!pack.plans.some((pl) => pl.app_code === a.app_code)) {
      issues.push({
        sheet: '02_Apps',
        field: 'app_code',
        message: `No Plan_${a.app_code} sheet found (app will import without plan)`,
        messageAr: `لا توجد ورقة Plan_${a.app_code} (سيُستورد التطبيق بلا خطة)`,
      })
    }
  }

  return issues
}

/** Hard errors block import; soft warnings (missing plan sheets) do not. */
export function isBlockingIssue(issue: PackIssue): boolean {
  return !issue.message.includes('without plan') && !issue.message.includes('extra rows ignored')
}
