import type {
  Approval as PrismaApproval,
  ApprovalComment,
  Person,
  Project,
  ProjectApp,
  WbsItem,
  Milestone,
  SlaRecord,
  Risk,
  BudgetTransaction,
  DocumentItem,
  ActivityItem,
  NotificationItem,
} from '@prisma/client'

export function mapPerson(p: Person) {
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    role: p.role,
    appRole: p.appRole,
    email: p.email,
    username: p.username,
    mustChangePassword: p.mustChangePassword,
    department: p.department,
    allocation: p.allocation,
    availability: p.availability,
    active: p.active,
    projectIds: p.projectIds,
  }
}

export function mapProject(p: Project) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    nameAr: p.nameAr,
    description: p.description,
    descriptionAr: p.descriptionAr,
    managerId: p.managerId,
    status: p.status,
    plannedProgress: p.plannedProgress,
    actualProgress: p.actualProgress,
    plannedStart: p.plannedStart,
    plannedEnd: p.plannedEnd,
    forecastEnd: p.forecastEnd,
    actualStart: p.actualStart ?? undefined,
    phase: p.phase,
    budgetApproved: p.budgetApproved,
    budgetAllocated: p.budgetAllocated,
    budgetSpent: p.budgetSpent,
    slaCompliance: p.slaCompliance,
    riskLevel: p.riskLevel,
    summary: p.summary,
    summaryAr: p.summaryAr,
    managerUpdate: p.managerUpdate,
    managerUpdateAr: p.managerUpdateAr,
    charter: p.charter,
    charterAr: p.charterAr,
  }
}

export function mapApp(a: ProjectApp) {
  return {
    id: a.id,
    projectId: a.projectId,
    code: a.code,
    name: a.name,
    nameAr: a.nameAr,
    description: a.description,
    descriptionAr: a.descriptionAr,
    ownerId: a.ownerId ?? undefined,
    status: a.status,
    plannedStart: a.plannedStart,
    plannedEnd: a.plannedEnd,
    url: a.url ?? '',
    userCount: a.userCount ?? 0,
    readiness: a.readiness ?? 0,
    iconColor: a.iconColor ?? '#0F766E',
    publishStatus: a.publishStatus ?? 'Draft',
    featured: Boolean(a.featured),
    sortOrder: a.sortOrder ?? 0,
  }
}

export function mapWbs(w: WbsItem) {
  return {
    id: w.id,
    projectId: w.projectId,
    appId: w.appId ?? undefined,
    code: w.code ?? undefined,
    parentId: w.parentId ?? undefined,
    name: w.name,
    nameAr: w.nameAr,
    type: w.type,
    start: w.start,
    end: w.end,
    baselineStart: w.baselineStart,
    baselineEnd: w.baselineEnd,
    progress: w.progress,
    weightPct: w.weightPct ?? undefined,
    dependencies: w.dependencies,
    assigneeId: w.assigneeId ?? undefined,
    critical: w.critical || undefined,
    status: w.status,
    priority: w.priority ?? undefined,
    estimatedHours: w.estimatedHours ?? undefined,
    actualHours: w.actualHours ?? undefined,
    description: w.description ?? undefined,
  }
}

export function mapMilestone(m: Milestone) {
  return {
    id: m.id,
    projectId: m.projectId,
    name: m.name,
    nameAr: m.nameAr,
    ownerId: m.ownerId,
    baselineDate: m.baselineDate,
    forecastDate: m.forecastDate,
    actualDate: m.actualDate ?? undefined,
    status: m.status,
    dependencies: m.dependencies,
    deliverables: m.deliverables,
    deliverablesAr: m.deliverablesAr,
  }
}

export function mapSla(s: SlaRecord) {
  return {
    id: s.id,
    reference: s.reference,
    projectId: s.projectId,
    category: s.category,
    managerId: s.managerId,
    targetHours: s.targetHours,
    consumedHours: s.consumedHours,
    compliance: s.compliance,
    status: s.status,
    warningThreshold: s.warningThreshold,
    openedAt: s.openedAt,
    dueAt: s.dueAt,
    escalationCount: s.escalationCount,
  }
}

export function mapRisk(r: Risk) {
  return {
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    titleAr: r.titleAr,
    ownerId: r.ownerId,
    probability: r.probability,
    impact: r.impact,
    severity: r.severity,
    mitigation: r.mitigation,
    mitigationAr: r.mitigationAr,
    targetDate: r.targetDate,
    status: r.status,
    type: r.type,
    overdue: r.overdue || undefined,
  }
}

export function mapTx(t: BudgetTransaction) {
  return {
    id: t.id,
    projectId: t.projectId,
    date: t.date,
    category: t.category,
    description: t.description,
    amount: t.amount,
    type: t.type,
  }
}

export function mapApproval(a: PrismaApproval & { comments: ApprovalComment[] }) {
  return {
    id: a.id,
    projectId: a.projectId,
    type: a.type,
    title: a.title,
    titleAr: a.titleAr,
    requesterId: a.requesterId,
    status: a.status,
    submittedAt: a.submittedAt,
    decidedAt: a.decidedAt ?? undefined,
    comments: a.comments.map((c) => ({
      authorId: c.authorId,
      text: c.text,
      at: c.at,
    })),
  }
}

export function mapDoc(d: DocumentItem) {
  return {
    id: d.id,
    projectId: d.projectId,
    name: d.name,
    category: d.category,
    uploadedBy: d.uploadedBy,
    uploadedAt: d.uploadedAt,
    size: d.size,
    version: d.version,
  }
}

export function mapActivity(a: ActivityItem) {
  return {
    id: a.id,
    projectId: a.projectId,
    type: a.type,
    title: a.title,
    titleAr: a.titleAr,
    actorId: a.actorId,
    at: a.at,
  }
}

export function mapNotification(n: NotificationItem) {
  return {
    id: n.id,
    title: n.title,
    titleAr: n.titleAr,
    body: n.body,
    bodyAr: n.bodyAr,
    at: n.at,
    read: n.read,
    href: n.href ?? undefined,
  }
}
