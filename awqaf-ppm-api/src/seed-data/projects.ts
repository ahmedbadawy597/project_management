import type { Project } from './types'

/** Reference date for empty schedules (not demo progress). */
export const DEMO_TODAY = '2026-11-15'

/** Official main project — Ministry of Awqaf Digital Applications Management. */
export const projects: Project[] = [
  {
    id: 'prj-awqaf',
    code: 'AWQAF-PPM',
    name: 'Ministry of Awqaf — Digital Applications Management',
    nameAr: 'وزارة الأوقاف — إدارة التطبيقات الرقمية',
    description:
      'Centralized management of the Ministry of Awqaf digital applications: development, maintenance, delivery, and operational readiness.',
    descriptionAr:
      'إدارة مركزية لتطبيقات وزارة الأوقاف الرقمية: التطوير والصيانة والتسليم وجاهزية التشغيل.',
    managerId: 'p-admin',
    status: 'Active',
    plannedProgress: 0,
    actualProgress: 0,
    plannedStart: '2026-01-01',
    plannedEnd: '2026-12-31',
    forecastEnd: '2026-12-31',
    actualStart: '2026-01-01',
    phase: 'Execution',
    budgetApproved: 0,
    budgetAllocated: 0,
    budgetSpent: 0,
    slaCompliance: 0,
    riskLevel: 'Low',
    summary:
      'Official Ministry of Awqaf platform project. Application registry is initialized; detailed WBS, tasks, and milestones are created by authorized project managers.',
    summaryAr:
      'مشروع منصة وزارة الأوقاف الرسمي. سِجل التطبيقات مهيأ؛ تفاصيل هيكل العمل والمهام والمعالم يُنشئها مديرو المشاريع المخوّلون.',
    managerUpdate: '',
    managerUpdateAr: '',
    charter:
      'Govern digital applications for the Ministry of Awqaf with clear ownership, delivery tracking, and operational readiness.',
    charterAr:
      'حوكمة التطبيقات الرقمية لوزارة الأوقاف بملكية واضحة وتتبع للتسليم وجاهزية تشغيلية.',
  },
]
