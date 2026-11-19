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
