/** Stable slug for codes used in deterministic entity ids. */
export function slugCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function projectIdFromCode(projectCode: string): string {
  return `prj-${slugCode(projectCode).toLowerCase()}`
}

export function appIdFromCode(appCode: string): string {
  return `app-${slugCode(appCode).toLowerCase()}`
}

export function wbsIdFromCodes(projectId: string, appCode: string, itemCode: string): string {
  return `wbs-${projectId}-${slugCode(appCode).toLowerCase()}-${slugCode(itemCode).toLowerCase()}`
}

export function milestoneIdFromCodes(projectId: string, appCode: string, itemCode: string): string {
  return `ms-${projectId}-${slugCode(appCode).toLowerCase()}-${slugCode(itemCode).toLowerCase()}`
}

export function riskIdFromCodes(projectId: string, appCode: string, itemCode: string): string {
  return `risk-${projectId}-${slugCode(appCode).toLowerCase()}-${slugCode(itemCode).toLowerCase()}`
}

export function planSheetName(appCode: string): string {
  return `Plan_${slugCode(appCode)}`
}

export function appCodeFromPlanSheet(sheetName: string): string | null {
  if (!sheetName.startsWith('Plan_')) return null
  const rest = sheetName.slice('Plan_'.length).trim()
  if (!rest || rest.toUpperCase() === 'TEMPLATE') return null
  return slugCode(rest)
}
